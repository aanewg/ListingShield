// ─── Scraper ──────────────────────────────────────────────────────────────────
// Extracts listing data from marketplace URLs using fetch + HTML parsing.
// No external dependencies — uses meta tags, JSON-LD, and platform-specific
// patterns found in server-rendered HTML.

export interface ScrapedListing {
  title:         string;
  description:   string;
  price:         number | null;   // null = visible on page but couldn't parse
  imageUrls:     string[];
  sellerUsername?: string;
  category?:     string;
  partial?:      boolean;         // true when some fields are missing
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)));
}

function getMeta(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']([^"'<>]+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name|itemprop)=["']${escaped}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function getJsonLd(html: string): unknown[] {
  const results: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch { /* malformed */ }
  }
  return results;
}

function findJsonLdNode(html: string, types: string[]): Record<string, unknown> | null {
  for (const node of getJsonLd(html)) {
    const n = node as Record<string, unknown>;
    if (types.includes(n["@type"] as string)) return n;
    const graph = n["@graph"];
    if (Array.isArray(graph)) {
      for (const g of graph) {
        const gn = g as Record<string, unknown>;
        if (types.includes(gn["@type"] as string)) return gn;
      }
    }
  }
  return null;
}

function parsePrice(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).replace(/[^0-9.]/g, "");
  const n   = parseFloat(str);
  return isNaN(n) || n <= 0 ? null : n;
}

export function priceFromText(text: string): number | null {
  // Match "$29", "$1,200", "$29.99", "29.99"
  const m = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  if (m) return parseFloat(m[1].replace(/,/g, ""));
  // Plain number fallback: "Price: 49" or "49 USD"
  const plain = text.match(/(?:^|\s)([\d]{1,5}(?:\.\d{1,2})?)(?:\s*(?:USD|dollars?)|$)/i);
  if (plain) return parseFloat(plain[1]);
  return null;
}

// ─── Facebook Marketplace ─────────────────────────────────────────────────────
// Facebook embeds listing data in JSON blobs inside the page.
// We try multiple UAs and extract price from og: tags AND embedded JSON data.

function extractFbPrice(html: string, ogTitle: string | null, ogDesc: string | null): number | null {
  // 1. og:description — Facebook often puts "$50 · Condition: Used" here
  if (ogDesc) { const p = priceFromText(ogDesc); if (p) return p; }

  // 2. og:title cleaned — sometimes "Item – $50 | Facebook Marketplace"
  if (ogTitle) { const p = priceFromText(ogTitle); if (p) return p; }

  // 3. "listing_price":{"amount":"50","currency":"USD"}  (most reliable)
  const lp = html.match(/"listing_price"\s*[:{][^}]{0,200}"amount"\s*:\s*"?([\d.]+)"?/);
  if (lp) { const v = parseFloat(lp[1]); if (v > 0) return v; }

  // 4. "price":{"amount":"50.00",...}
  const pa = html.match(/"price"\s*:\s*\{\s*"amount"\s*:\s*"?([\d.]+)"?/);
  if (pa) { const v = parseFloat(pa[1]); if (v > 0) return v; }

  // 5. "price":"50" or "price":50  (simple scalar)
  const ps = html.match(/"price"\s*:\s*"?([\d.]+)"?(?!\s*:)/);
  if (ps) { const v = parseFloat(ps[1]); if (v > 0 && v < 1_000_000) return v; }

  // 6. <script type="application/json"> data islands (Relay store)
  for (const m of html.matchAll(/<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const am = m[1].match(/"amount"\s*:\s*"?([\d.]+)"?/);
    if (am) { const v = parseFloat(am[1]); if (v > 0) return v; }
  }

  // 7. Any inline script that mentions price + amount
  for (const m of html.matchAll(/<script[^>]*>([\s\S]{0,8000}?)<\/script>/gi)) {
    const s = m[1];
    if (!s.includes('"price"') && !s.includes("listing_price")) continue;
    const am = s.match(/"amount"\s*:\s*"?([\d.]+)"?/);
    if (am) { const v = parseFloat(am[1]); if (v > 0 && v < 1_000_000) return v; }
  }

  // 8. Full stripped-text scan (extended depth)
  return priceFromText(html.replace(/<[^>]+>/g, " ").slice(0, 20_000));
}

async function scrapeFacebook(url: string): Promise<ScrapedListing | null> {
  const attempts = [
    // Facebook's own external-hit crawler — highest chance of getting full og: data
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    // Social bots
    "Twitterbot/1.0",
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    // Mobile — lighter shell, less JS gating
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    // Desktop Chrome
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  ];

  const urlVariants = [
    url,
    url.replace("www.facebook.com", "mbasic.facebook.com"),  // no-JS lightweight version
    url.replace("www.facebook.com", "m.facebook.com"),
    url.replace("www.facebook.com", "lm.facebook.com"),       // Facebook Lite
  ];

  for (const variant of urlVariants) {
    for (const ua of attempts) {
      try {
        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(variant, {
          headers: {
            "User-Agent":      ua,
            "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control":   "no-cache",
          },
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) continue;

        const html = await res.text();

        const ogTitle = getMeta(html, "og:title");
        const ogDesc  = getMeta(html, "og:description");
        const ogImage = getMeta(html, "og:image");

        // Reject login / error pages
        const isLoginPage =
          !ogTitle ||
          /^(facebook|log in|sign up|create new account)$/i.test(ogTitle.trim()) ||
          /log in|sign up|create an account/i.test(ogTitle);

        if (isLoginPage) continue;

        // Clean title — strip " | Facebook Marketplace" suffix etc.
        const cleanedTitle = (ogTitle ?? "")
          .replace(/\s*[|–-]\s*Facebook.*$/i, "")
          .trim();

        if (!cleanedTitle) continue;

        const price = extractFbPrice(html, cleanedTitle, ogDesc ?? null);

        // Try to pull a richer description from embedded JSON
        let description = ogDesc?.replace(/\s*[|–-]\s*Facebook.*$/i, "").trim() ?? "";
        if (!description || description.length < 20) {
          const dm = html.match(/"listing_description"\s*:\s*"([^"]{10,})"/);
          if (dm) description = decodeEntities(dm[1].replace(/\\n/g, " ").replace(/\\"/g, '"'));
        }

        return {
          title:       cleanedTitle,
          description: description || "Facebook Marketplace listing.",
          price,
          imageUrls:   ogImage ? [ogImage] : [],
          partial:     price === null,
        };
      } catch { continue; }
    }
  }

  return null;
}

// ─── Platform-specific helpers ────────────────────────────────────────────────

function extractEbayData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};
  const priceContent =
    html.match(/itemprop=["']price["'][^>]+content=["']([\d.]+)["']/i)?.[1] ??
    html.match(/content=["']([\d.]+)["'][^>]+itemprop=["']price["']/i)?.[1];
  if (priceContent) data.price = parseFloat(priceContent);
  const sellerLink = html.match(/\/usr\/([^"'?/\s]{2,50})/)?.[1];
  if (sellerLink) data.sellerUsername = decodeEntities(sellerLink);
  return data;
}

function extractMercariData(html: string): Partial<ScrapedListing> {
  const priceMatch = html.match(/"price"\s*:\s*(\d+)/);
  return priceMatch ? { price: parseInt(priceMatch[1], 10) } : {};
}

function extractPoshmarkData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};
  const priceMatch = html.match(/"price"\s*:\s*"?([\d.]+)"?/);
  if (priceMatch) data.price = parseFloat(priceMatch[1]);
  const seller = html.match(/\/closet\/([^"'?/\s]{2,40})/)?.[1];
  if (seller) data.sellerUsername = seller;
  return data;
}

function extractDepopData(html: string): Partial<ScrapedListing> {
  const priceMatch = html.match(/"price"\s*:\s*"?([\d.]+)"?/);
  return priceMatch ? { price: parseFloat(priceMatch[1]) } : {};
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeListing(url: string): Promise<ScrapedListing | null> {
  // Facebook needs its own flow
  if (url.includes("facebook.com")) return scrapeFacebook(url);

  let html: string;
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);
    const res        = await fetch(url, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control":   "no-cache",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // 1. JSON-LD
  const product = findJsonLdNode(html, ["Product", "IndividualProduct"]);
  const offer   = (
    product
      ? (product["offers"] as Record<string, unknown> | undefined)
      : findJsonLdNode(html, ["Offer"])
  ) as Record<string, unknown> | undefined;

  let title         = product?.["name"] as string | undefined;
  let description   = product?.["description"] as string | undefined;
  let price         = parsePrice(offer?.["price"] ?? offer?.["lowPrice"]);
  let imageUrls:    string[] = [];
  let sellerUsername: string | undefined;
  let category:     string | undefined;

  const ldImage = product?.["image"];
  if (typeof ldImage === "string") imageUrls.push(ldImage);
  else if (Array.isArray(ldImage)) imageUrls.push(...ldImage.filter((i): i is string => typeof i === "string"));

  const seller = offer?.["seller"] as Record<string, unknown> | undefined;
  if (seller?.["name"]) sellerUsername = seller["name"] as string;
  if (product?.["category"]) category = String(product["category"]);

  // 2. Meta tags
  if (!title)       title       = getMeta(html, "og:title")       ?? getMeta(html, "twitter:title")       ?? undefined;
  if (!description) description = getMeta(html, "og:description") ?? getMeta(html, "description")         ?? getMeta(html, "twitter:description") ?? undefined;
  if (!price)       price       = parsePrice(getMeta(html, "product:price:amount") ?? getMeta(html, "og:price:amount"));
  if (imageUrls.length === 0) {
    const ogImg = getMeta(html, "og:image");
    if (ogImg) imageUrls.push(ogImg);
  }

  // 3. Platform-specific
  let pd: Partial<ScrapedListing> = {};
  if (url.includes("ebay.com"))     pd = extractEbayData(html);
  if (url.includes("mercari.com"))  pd = extractMercariData(html);
  if (url.includes("poshmark.com")) pd = extractPoshmarkData(html);
  if (url.includes("depop.com"))    pd = extractDepopData(html);

  if (!price          && pd.price)          price          = pd.price;
  if (!sellerUsername && pd.sellerUsername)  sellerUsername = pd.sellerUsername;
  if (!description    && pd.description)    description    = pd.description;

  // 4. Last-resort price scan
  if (!price) price = priceFromText(html.replace(/<[^>]+>/g, " ").slice(0, 5000));

  // 5. Title fallback
  if (!title) {
    const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    if (pageTitle) title = decodeEntities(pageTitle.trim());
  }

  if (!title) return null;

  return {
    title:       title.trim(),
    description: (description ?? "").trim() || "No description available.",
    price:       price && price > 0 ? price : null,
    imageUrls:   [...new Set(imageUrls)].slice(0, 5),
    sellerUsername,
    category,
    partial:     !price || price <= 0,
  };
}
