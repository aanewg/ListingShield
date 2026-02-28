// ─── Scraper ──────────────────────────────────────────────────────────────────
// Extracts listing data from marketplace URLs using fetch + HTML parsing.
// No external dependencies — uses meta tags, JSON-LD, and platform-specific
// patterns found in server-rendered HTML.

export interface ScrapedListing {
  title:        string;
  description:  string;
  price:        number;
  imageUrls:    string[];
  sellerUsername?: string;
  category?:    string;
}

// ─── Browser headers to avoid basic bot blocks ────────────────────────────────

const HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control":   "no-cache",
};

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

/** Extract the content="" value from a <meta> tag by property or name. */
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

/** Extract all JSON-LD script blocks as parsed objects. */
function getJsonLd(html: string): unknown[] {
  const results: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch { /* malformed JSON-LD — skip */ }
  }
  return results;
}

/** Find the first JSON-LD node matching one of the given @types. */
function findJsonLdNode(html: string, types: string[]): Record<string, unknown> | null {
  for (const node of getJsonLd(html)) {
    const n = node as Record<string, unknown>;
    if (types.includes(n["@type"] as string)) return n;
    // Some schemas nest products inside a graph
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

/** Try to extract a price from common text patterns (e.g. "$29.99"). */
function priceFromText(text: string): number | null {
  const m = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

// ─── Platform-specific extractors ─────────────────────────────────────────────

function extractEbayData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};

  // Price: <span itemprop="price" content="29.99">
  const priceContent = html.match(/itemprop=["']price["'][^>]+content=["']([\d.]+)["']/i)?.[1]
                    ?? html.match(/content=["']([\d.]+)["'][^>]+itemprop=["']price["']/i)?.[1];
  if (priceContent) data.price = parseFloat(priceContent);

  // Seller username: appears in data-testid="str-title" or as /usr/ link
  const sellerLink = html.match(/\/usr\/([^"'?/\s]{2,50})/)?.[1];
  if (sellerLink) data.sellerUsername = decodeEntities(sellerLink);

  return data;
}

function extractMercariData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};
  // Mercari injects price into og tags reliably; try JSON blobs as backup
  const priceMatch = html.match(/"price"\s*:\s*(\d+)/);
  if (priceMatch) data.price = parseInt(priceMatch[1], 10);
  return data;
}

function extractPoshmarkData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};
  const priceMatch = html.match(/"price"\s*:\s*"?([\d.]+)"?/);
  if (priceMatch) data.price = parseFloat(priceMatch[1]);
  // Seller: /closet/{username}
  const seller = html.match(/\/closet\/([^"'?/\s]{2,40})/)?.[1];
  if (seller) data.sellerUsername = seller;
  return data;
}

function extractDepopData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};
  const priceMatch = html.match(/"price"\s*:\s*"?([\d.]+)"?/);
  if (priceMatch) data.price = parseFloat(priceMatch[1]);
  return data;
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeListing(url: string): Promise<ScrapedListing | null> {
  let html: string;

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);
    const res        = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // ── 1. JSON-LD (most structured) ──────────────────────────────────────────

  const product = findJsonLdNode(html, ["Product", "IndividualProduct"]);
  const offer   = (
    product
      ? (product["offers"] as Record<string, unknown> | undefined)
      : findJsonLdNode(html, ["Offer"])
  ) as Record<string, unknown> | undefined;

  let title       = product?.["name"] as string | undefined;
  let description = (product?.["description"] as string | undefined);
  let price       = parsePrice(offer?.["price"] ?? offer?.["lowPrice"]);
  let imageUrls:  string[] = [];
  let sellerUsername: string | undefined;
  let category: string | undefined;

  // Image from JSON-LD
  const ldImage = product?.["image"];
  if (typeof ldImage === "string") imageUrls.push(ldImage);
  else if (Array.isArray(ldImage)) imageUrls.push(...ldImage.filter((i): i is string => typeof i === "string"));

  // Seller from JSON-LD
  const seller = offer?.["seller"] as Record<string, unknown> | undefined;
  if (seller?.["name"]) sellerUsername = seller["name"] as string;

  // Category from JSON-LD
  if (product?.["category"]) category = String(product["category"]);

  // ── 2. Open Graph / meta tags (universal fallback) ────────────────────────

  if (!title)       title       = getMeta(html, "og:title")        ?? getMeta(html, "twitter:title")    ?? undefined;
  if (!description) description = getMeta(html, "og:description")  ?? getMeta(html, "description")      ?? getMeta(html, "twitter:description") ?? undefined;
  if (!price)       price       = parsePrice(getMeta(html, "product:price:amount") ?? getMeta(html, "og:price:amount"));

  // Image from OG
  if (imageUrls.length === 0) {
    const ogImg = getMeta(html, "og:image");
    if (ogImg) imageUrls.push(ogImg);
  }

  // ── 3. Platform-specific fallbacks ────────────────────────────────────────

  let platformData: Partial<ScrapedListing> = {};
  if (url.includes("ebay.com"))     platformData = extractEbayData(html);
  if (url.includes("mercari.com"))  platformData = extractMercariData(html);
  if (url.includes("poshmark.com")) platformData = extractPoshmarkData(html);
  if (url.includes("depop.com"))    platformData = extractDepopData(html);

  if (!price           && platformData.price)          price           = platformData.price;
  if (!sellerUsername  && platformData.sellerUsername)  sellerUsername  = platformData.sellerUsername;
  if (!description     && platformData.description)     description     = platformData.description;

  // ── 4. Last-resort price: scan visible text ───────────────────────────────

  if (!price) {
    const strippedHtml = html.replace(/<[^>]+>/g, " ");
    price = priceFromText(strippedHtml);
  }

  // ── 5. Title fallback: <title> tag ────────────────────────────────────────

  if (!title) {
    const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    if (pageTitle) title = decodeEntities(pageTitle.trim());
  }

  // ── Validate we have the minimum required fields ──────────────────────────

  if (!title || !price || price <= 0) return null;

  return {
    title:       title.trim(),
    description: (description ?? "").trim() || "No description available.",
    price,
    imageUrls:   [...new Set(imageUrls)].slice(0, 5),
    sellerUsername,
    category,
  };
}
