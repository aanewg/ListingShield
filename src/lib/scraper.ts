// ─── Scraper ──────────────────────────────────────────────────────────────────
// Extracts listing data from marketplace URLs using fetch + HTML parsing.
// No external dependencies — uses meta tags, JSON-LD, and platform-specific
// patterns found in server-rendered HTML.

export interface ScrapedListing {
  title:              string;
  description:        string;
  price:              number | null;   // null = visible on page but couldn't parse
  imageUrls:          string[];
  sellerUsername?:    string;
  sellerAccountAge?:  number;          // days since account creation
  sellerReviewCount?: number;
  sellerAvgRating?:   number;          // 0–5 scale
  sellerIsVerified?:  boolean;
  category?:          string;
  platform?:          string;          // auto-detected platform
  partial?:           boolean;         // true when some fields are missing
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Convert any timestamp representation to days-since-that-date.
 *  - number < 1e10  → Unix seconds (epoch ~2001 at boundary; safe for all real dates)
 *  - number >= 1e10 → Unix milliseconds
 *  - string         → parsed as ISO 8601 by the Date constructor
 */
function daysAgo(value: string | number): number | null {
  try {
    let ms: number;
    if (typeof value === "number") {
      ms = value < 1e10 ? value * 1000 : value;
    } else {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      ms = d.getTime();
    }
    const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : null;
  } catch { return null; }
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
  // Use [\s\S]*? so content values with literal newlines are captured correctly
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']((?:[^"'<>]|&#[0-9]+;)*?)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']((?:[^"'<>]|&#[0-9]+;)*?)["'][^>]+(?:property|name|itemprop)=["']${escaped}["']`, "i"),
    // Fallback: allow newlines inside content value (FB multiline og:description)
    new RegExp(`<meta[^>]*(?:property|name|itemprop)=["']${escaped}["'][^>]*content=["']([\\s\\S]*?)["'][^>]*/?>`, "i"),
    new RegExp(`<meta[^>]*content=["']([\\s\\S]*?)["'][^>]*(?:property|name|itemprop)=["']${escaped}["'][^>]*/?>`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]?.trim()) return decodeEntities(m[1].trim());
  }
  return null;
}

function getJsonLd(html: string): unknown[] {
  const results: unknown[] = [];
  // Allow unquoted type attribute (e.g. eBay uses type=application/ld+json without quotes)
  const re = /<script[^>]*\btype=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
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
// With a Googlebot UA, Facebook serves the full Relay store JSON including
// "listing_price":{"amount":"40.00"} and "redacted_description":{"text":"..."}.
// We try Googlebot first, then fall back to social-bot UAs for og: tags.

/** Extract price, description, category from the Relay JSON Facebook serves to Googlebot. */
function extractFbRelayData(html: string): {
  price: number | null;
  description: string | null;
  category: string | null;
  sellerName: string | null;
} {
  let price: number | null = null;
  let description: string | null = null;
  let category: string | null = null;
  let sellerName: string | null = null;

  // redacted_description appears exactly once — unique to the main listing
  const descMatch = html.match(/"redacted_description":\{"text":"((?:[^"\\]|\\.)*)"/);
  if (descMatch) {
    description = descMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  // listing_price near redacted_description — find the price immediately following it
  const priceBlockMatch = html.match(
    /"listing_price":\{"formatted_amount_zeros_stripped":"[^"]*","amount_with_offset_in_currency":"[^"]*","amount":"([\d.]+)","currency":"([A-Z]+)"\}/
  );
  if (priceBlockMatch) {
    const v = parseFloat(priceBlockMatch[1]);
    if (v > 0) price = v;
  }

  // Fallback: any listing_price.amount pattern
  if (!price) {
    const lpMatch = html.match(/"listing_price":\{[^}]{0,200}"amount":"([\d.]+)"/);
    if (lpMatch) { const v = parseFloat(lpMatch[1]); if (v > 0) price = v; }
  }

  // Category name
  const catMatch = html.match(/"marketplace_listing_category_name":"([^"]{3,60})"/);
  if (catMatch) category = catMatch[1];

  // Seller name — marketplace_listing_seller is null without login,
  // but sometimes actor name is present
  const snMatch = html.match(/"marketplace_listing_seller":\{"__typename":"User","id":"[^"]+","name":"([^"]{2,60})"/);
  if (snMatch) sellerName = snMatch[1];

  return { price, description, category, sellerName };
}

async function scrapeFacebook(url: string): Promise<ScrapedListing | null> {
  // Strip tracking query params — they can cause redirect loops
  const cleanUrl = url.split("?")[0].replace(/\/$/, "") + "/";
  const itemId   = cleanUrl.match(/marketplace\/item\/(\d+)/)?.[1];

  async function fetchFb(variant: string, ua: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(variant, {
        headers: {
          "User-Agent":      ua,
          "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "identity",
          "Cache-Control":   "no-cache",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok ? res.text() : null;
    } catch { return null; }
  }

  // ── Strategy 1: Googlebot UA ─────────────────────────────────────────────
  // Facebook serves the full Relay store JSON (with price + full description)
  // to Googlebot. This is the ONLY way to get price without login.
  const googlebotHtml = await fetchFb(
    cleanUrl,
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
  );

  if (googlebotHtml && googlebotHtml.length > 50_000) {
    const relay = extractFbRelayData(googlebotHtml);
    const ogTitle = getMeta(googlebotHtml, "og:title");
    const ogImage = getMeta(googlebotHtml, "og:image");

    const rawTitle = ogTitle ?? googlebotHtml.match(/"base_marketplace_listing_title":"([^"]+)"/)?.[1] ?? "";
    const cleanedTitle = rawTitle.replace(/\s*[|–—-]\s*Facebook.*$/i, "").trim();

    // Googlebot response is only useful if it has title + description or price
    if (cleanedTitle && (relay.price !== null || relay.description)) {
      return {
        title:         cleanedTitle,
        description:   relay.description || "Facebook Marketplace listing.",
        price:         relay.price,
        imageUrls:     ogImage ? [ogImage] : [],
        sellerUsername: relay.sellerName ?? undefined,
        category:      relay.category ?? undefined,
        partial:       relay.price === null,
      };
    }
  }

  // ── Strategy 2: Social-bot UAs for og: tag fallback ──────────────────────
  const socialUAs = [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Twitterbot/1.0",
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  ];

  for (const ua of socialUAs) {
    const html = await fetchFb(cleanUrl, ua);
    if (!html) continue;

    const ogTitle = getMeta(html, "og:title");
    const ogDesc  = getMeta(html, "og:description");
    const ogImage = getMeta(html, "og:image");

    if (
      !ogTitle ||
      /^(facebook|log in|sign up|create new account)$/i.test(ogTitle.trim()) ||
      /log in|sign up|create an account/i.test(ogTitle)
    ) continue;

    const cleanedTitle = ogTitle.replace(/\s*[|–—-]\s*Facebook.*$/i, "").trim();
    if (!cleanedTitle) continue;

    // Try price from og: text (rarely works but worth trying)
    const price = (ogDesc ? priceFromText(ogDesc) : null) ?? priceFromText(cleanedTitle);

    const description = (ogDesc ?? "").replace(/\s*[|–—-]\s*Facebook.*$/i, "").trim();

    return {
      title:       cleanedTitle,
      description: description || "Facebook Marketplace listing.",
      price,
      imageUrls:   ogImage ? [ogImage] : [],
      partial:     price === null,
    };
  }

  // ── Strategy 3: last resort — return skeleton so form always shows ────────
  if (itemId) {
    return { title: "", description: "", price: null, imageUrls: [], partial: true };
  }

  return null;
}

// ─── eBay member-since date parser ────────────────────────────────────────────

/** Maps 3-letter month abbreviations (lower-cased) to zero-padded month numbers. */
const MONTH_ABBREVS: Readonly<Record<string, string>> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Return the two-digit month string for any full or abbreviated month name. */
function monthIndex(name: string): string {
  return MONTH_ABBREVS[name.toLowerCase().slice(0, 3)] ?? "01";
}

/**
 * Parse eBay's many memberSince date formats into days-since.
 * Handles all observed formats:
 *   "2019-01-15"   ISO 8601 full date
 *   "2019-01"      ISO year-month (assumes 1st)
 *   "Jan 15, 2019" named month + explicit day
 *   "January 2019" named month only (assumes 1st)
 *   "15-Jan-19"    DD-MMM-YY legacy compact
 *   "Jan-19"       MMM-YY legacy short (assumes 1st)
 */
function parseMemberSince(raw: string): number | null {
  const s = raw.trim();

  // ISO 8601 full ("2019-01-15") or year-month ("2019-01") — pass straight to daysAgo
  if (/^\d{4}-\d{2}/.test(s)) return daysAgo(s);

  // "January 15, 2019" or "Jan 15, 2019" — named month with explicit day
  const mdy = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdy) return daysAgo(`${mdy[3]}-${monthIndex(mdy[1])}-${mdy[2].padStart(2, "0")}`);

  // "January 2019" or "Jan 2019" — no day given, default to 1st
  const my = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (my) return daysAgo(`${my[2]}-${monthIndex(my[1])}-01`);

  // "15-Jan-19" — DD-MMM-YY eBay legacy compact format
  const dmyShort = s.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2})$/);
  if (dmyShort) {
    const yy   = parseInt(dmyShort[3], 10);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy;
    return daysAgo(`${year}-${monthIndex(dmyShort[2])}-${dmyShort[1].padStart(2, "0")}`);
  }

  // "Jan-19" — MMM-YY eBay short format, default to 1st of that month
  const myShort = s.match(/^([A-Za-z]+)-(\d{2})$/);
  if (myShort) {
    const yy   = parseInt(myShort[2], 10);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy;
    return daysAgo(`${year}-${monthIndex(myShort[1])}-01`);
  }

  // Last resort: let the JS Date constructor attempt native parsing
  return daysAgo(s);
}

// ─── __NEXT_DATA__ deep seller search ─────────────────────────────────────────

/**
 * Recursively search a parsed __NEXT_DATA__ tree for a seller-shaped node.
 * Fingerprint: node must satisfy at least TWO of these three categories:
 *   identity  — has key: name | username | handle
 *   rating    — has key: rating | reviewsTotal | reviewsAverage | avg_rating | rating_count
 *   creation  — has key: created | created_at | joined_at | registration_date | member_since
 *
 * Depth-limited to 8 to avoid runaway traversal on large page blobs.
 */
function deepFindSeller(obj: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 8 || obj === null || typeof obj !== "object") return null;

  // Recurse into arrays — sellers can be nested inside lists
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepFindSeller(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  const o = obj as Record<string, unknown>;

  // Evaluate fingerprint across three independent categories
  const hasIdentity = "name"     in o || "username"       in o || "handle"       in o;
  const hasRating   = "rating"   in o || "reviewsTotal"   in o || "reviewsAverage" in o ||
                      "avg_rating" in o || "rating_count" in o;
  const hasCreation = "created"  in o || "created_at"     in o || "joined_at"    in o ||
                      "registration_date" in o || "member_since" in o;

  const score = (hasIdentity ? 1 : 0) + (hasRating ? 1 : 0) + (hasCreation ? 1 : 0);
  if (score >= 2) return o;

  for (const val of Object.values(o)) {
    const found = deepFindSeller(val, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

// ─── Platform-specific helpers ────────────────────────────────────────────────

/** Pull __NEXT_DATA__ JSON safely, returning the parsed object or null. */
function getNextData(html: string): Record<string, unknown> | null {
  const raw = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) return null;
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
}

function extractEbayData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};

  // ── Price (unchanged) ─────────────────────────────────────────────────────
  // Microdata itemprop="price" content attribute — most reliable eBay price source
  const priceContent =
    html.match(/itemprop=["']price["'][^>]+content=["']([\d.]+)["']/i)?.[1] ??
    html.match(/content=["']([\d.]+)["'][^>]+itemprop=["']price["']/i)?.[1];
  if (priceContent) data.price = parseFloat(priceContent);

  // ── Seller username ───────────────────────────────────────────────────────
  // Primary: "username":"value" embedded in eBay's React/VIBES page data JSON
  const usernameJson = html.match(/"username"\s*:\s*"([^"]{2,50})"/)?.[1];
  if (usernameJson) data.sellerUsername = usernameJson;
  // Fallback: /usr/USERNAME anchor href pattern in rendered HTML
  if (!data.sellerUsername) {
    const usrLink = html.match(/\/usr\/([^"'?/#\s]{2,50})/)?.[1];
    if (usrLink) data.sellerUsername = decodeEntities(usrLink);
  }

  // ── Account age ───────────────────────────────────────────────────────────
  // Primary: "memberSince" or "member_since" JSON keys — many date formats observed;
  // parseMemberSince handles ISO, "Jan 2019", "Jan-19", "15-Jan-19", etc.
  const memberSinceRaw =
    html.match(/"memberSince"\s*:\s*"([^"]{4,30})"/)?.[1] ??
    html.match(/"member_since"\s*:\s*"([^"]{4,30})"/)?.[1];
  if (memberSinceRaw) {
    const days = parseMemberSince(memberSinceRaw);
    if (days !== null) data.sellerAccountAge = days;
  }
  // Fallback: "Member since Month YYYY" (or "Month DD, YYYY") visible page text
  if (data.sellerAccountAge === undefined) {
    // Capture everything after "Member since" up to a likely delimiter
    const textMatch = html.match(
      /[Mm]ember\s+since\s+([A-Za-z]+(?:\s+\d{1,2},?)?\s+\d{2,4})/
    )?.[1];
    if (textMatch) {
      const days = parseMemberSince(textMatch);
      if (days !== null) data.sellerAccountAge = days;
    }
  }

  // ── Review count ──────────────────────────────────────────────────────────
  // Primary: JSON key variants used across eBay's API responses and page blobs
  const fbRawJson = html.match(
    /"(?:feedbackCount|positiveCount|feedback_count|feedbackScore)"\s*:\s*(\d+)/
  )?.[1];
  if (fbRawJson) data.sellerReviewCount = parseInt(fbRawJson, 10);
  // Fallback 1: "1,234 feedback" or "1,234 ratings" visible text (commas stripped)
  if (data.sellerReviewCount === undefined) {
    const textRaw = html.match(/(\d[\d,]*)\s+(?:feedback|ratings?)\b/i)?.[1]?.replace(/,/g, "");
    if (textRaw) data.sellerReviewCount = parseInt(textRaw, 10);
  }
  // Fallback 2: JSON-LD reviewCount (product aggregate — less precise but available)
  if (data.sellerReviewCount === undefined) {
    const rc = html.match(/"reviewCount"\s*:\s*"?(\d+)"?/)?.[1];
    if (rc) data.sellerReviewCount = parseInt(rc, 10);
  }

  // ── Rating ────────────────────────────────────────────────────────────────
  // Primary: positive-feedback percentage → 5-star approximation.
  // ⚠️ This conversion is intentionally lossy: 98% ≈ 4.9★ is indistinguishable
  // from 99% ≈ 4.95★. It is the only public seller-quality signal eBay exposes.
  // Result is clamped to 5.0 in case the platform ever returns > 100%.
  const posPct =
    html.match(/"positivePercentage"\s*:\s*([\d.]+)/)?.[1] ??
    // feedbackPercentage may include a trailing % inside the quoted value
    html.match(/"feedbackPercentage"\s*:\s*"?([\d.]+)%?/)?.[1];
  if (posPct) {
    data.sellerAvgRating = Math.min(5.0, Math.round((parseFloat(posPct) / 100) * 5 * 10) / 10);
  }
  // Fallback: JSON-LD aggregateRating.ratingValue (product reviews, not seller — use if no %)
  if (data.sellerAvgRating === undefined) {
    const rv = html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?/)?.[1];
    if (rv) data.sellerAvgRating = Math.min(5.0, parseFloat(rv));
  }

  // ── Verified (Top Rated Seller badge) ─────────────────────────────────────
  // "topRatedSeller":true in JSON data, or visible "Top Rated Seller" badge text
  if (/"topRatedSeller"\s*:\s*true/i.test(html) || /top[\s-]rated\s+seller/i.test(html)) {
    data.sellerIsVerified = true;
  }

  return data;
}

function extractMercariData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};

  // Price — "price":12345 integer in __NEXT_DATA__
  const pm = html.match(/"price"\s*:\s*(\d+)/);
  if (pm) data.price = parseInt(pm[1], 10);

  // ── __NEXT_DATA__ (primary path for all seller fields) ────────────────────
  try {
    const nd = getNextData(html);
    if (nd) {
      const ndPP   = (nd.props as Record<string, unknown> | undefined)?.pageProps as Record<string, unknown> | undefined;
      const ndData = ndPP?.data as Record<string, unknown> | undefined;
      // Item lives at pageProps.item OR pageProps.data.item depending on page type
      const item   = (ndPP?.item ?? ndData?.item) as Record<string, unknown> | undefined;

      let s: Record<string, unknown> | null = null;
      if (item) {
        if (!data.price && item.price) data.price = parseInt(String(item.price), 10);
        s = (item.seller as Record<string, unknown> | undefined) ?? null;
      }
      // Deep-search fallback: handles alternate nesting (search vs. item page)
      if (!s) s = deepFindSeller(nd);

      if (s) {
        // Mercari displays sellers by name (display name, not a handle/username)
        if (s.name)        data.sellerUsername    = String(s.name);
        const rating = s.rating as Record<string, unknown> | undefined;
        if (rating?.count)   data.sellerReviewCount = Number(rating.count);
        if (rating?.average) data.sellerAvgRating   = parseFloat(String(rating.average));
        if (s.is_verified)   data.sellerIsVerified  = Boolean(s.is_verified);
        // Timestamps may be Unix seconds (number) or ISO strings; daysAgo handles both
        const created = s.created ?? s.registration_date ?? s.created_at;
        if (created !== undefined && created !== null) {
          const days = daysAgo(created as string | number);
          if (days !== null) data.sellerAccountAge = days;
        }
      }
    }
  } catch { /* __NEXT_DATA__ missing or malformed — fall through to regex patterns */ }

  // ── Regex fallbacks ───────────────────────────────────────────────────────
  // sellerUsername: "name" key inside a "seller" object block (~300 char scan)
  if (!data.sellerUsername) {
    const nm = html.match(/"seller"\s*:\s*\{[^}]{0,300}"name"\s*:\s*"([^"]{2,50})"/)?.[1];
    if (nm) data.sellerUsername = nm;
  }
  // sellerReviewCount: "count" key inside a "rating" object block (~200 char scan)
  if (data.sellerReviewCount === undefined) {
    const rc = html.match(/"rating"\s*:\s*\{[^}]{0,200}"count"\s*:\s*(\d+)/)?.[1];
    if (rc) data.sellerReviewCount = parseInt(rc, 10);
  }
  // sellerAvgRating: "average" (Mercari) or "stars" float anywhere in page
  if (data.sellerAvgRating === undefined) {
    const ra = html.match(/"(?:average|stars)"\s*:\s*([\d.]+)/)?.[1];
    if (ra) data.sellerAvgRating = parseFloat(ra);
  }
  // sellerIsVerified: bare boolean flag anywhere in page JSON
  if (data.sellerIsVerified === undefined) {
    if (/"is_verified"\s*:\s*true/.test(html)) data.sellerIsVerified = true;
  }
  // sellerAccountAge: ISO date string for creation/registration fields
  if (data.sellerAccountAge === undefined) {
    const createdRaw =
      html.match(/"(?:created|registration_date|created_at)"\s*:\s*"([^"]{8,30})"/)?.[1];
    if (createdRaw) {
      const days = daysAgo(createdRaw);
      if (days !== null) data.sellerAccountAge = days;
    }
  }

  return data;
}

function extractPoshmarkData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};

  // Price — can be quoted ("50.00") or bare number
  const pm = html.match(/"price"\s*:\s*"?([\d.]+)"?/);
  if (pm) data.price = parseFloat(pm[1]);

  // Preliminary username from closet URL — overridden by __NEXT_DATA__ handle if available
  const closet = html.match(/\/closet\/([^"'?/#\s]{2,40})/)?.[1];
  if (closet) data.sellerUsername = closet;

  // ── __NEXT_DATA__ (primary path for all seller fields) ────────────────────
  try {
    const nd = getNextData(html);
    if (nd) {
      const pp = (nd.props as Record<string, unknown> | undefined)?.pageProps as Record<string, unknown> | undefined;
      // Listing lives at pageProps.listing OR pageProps.data depending on page version;
      // use explicit casts with correct precedence (not pp?.data as X ?? pp?.listing as X)
      const listing =
        (pp?.listing as Record<string, unknown> | undefined) ??
        (pp?.data    as Record<string, unknown> | undefined);
      // Seller may be listing.seller, listing.creator, or found via deep-search
      const s =
        (listing?.seller  as Record<string, unknown> | undefined) ??
        (listing?.creator as Record<string, unknown> | undefined) ??
        deepFindSeller(nd);

      if (s) {
        if (s.handle)            data.sellerUsername    = String(s.handle);
        if (s.avg_rating)        data.sellerAvgRating   = parseFloat(String(s.avg_rating));
        if (s.rating_count)      data.sellerReviewCount = parseInt(String(s.rating_count), 10);
        if (s.identity_verified) data.sellerIsVerified  = Boolean(s.identity_verified);
        // ⚠️ list_item_party_started is intentionally excluded — it records when the seller
        // joined a Poshmark sharing party, NOT when their account was created, and produces
        // artificially recent account ages that skew the fraud score upward.
        const joined = s.joined_at ?? s.member_since ?? s.created_at;
        if (joined !== undefined && joined !== null) {
          const days = daysAgo(joined as string | number);
          if (days !== null) data.sellerAccountAge = days;
        }
      }
    }
  } catch { /* __NEXT_DATA__ missing or malformed — fall through to regex patterns */ }

  // ── Regex fallbacks ───────────────────────────────────────────────────────
  // sellerAvgRating: bare "avg_rating" float anywhere in the page JSON
  if (data.sellerAvgRating === undefined) {
    const ra = html.match(/"avg_rating"\s*:\s*"?([\d.]+)"?/)?.[1];
    if (ra) data.sellerAvgRating = parseFloat(ra);
  }
  // sellerReviewCount: bare "rating_count" integer
  if (data.sellerReviewCount === undefined) {
    const rc = html.match(/"rating_count"\s*:\s*(\d+)/)?.[1];
    if (rc) data.sellerReviewCount = parseInt(rc, 10);
  }
  // sellerIsVerified: "identity_verified":true flag
  if (data.sellerIsVerified === undefined) {
    if (/"identity_verified"\s*:\s*true/.test(html)) data.sellerIsVerified = true;
  }
  // sellerAccountAge: ISO date string for any join/creation field
  if (data.sellerAccountAge === undefined) {
    const joinedRaw =
      html.match(/"(?:joined_at|member_since|created_at)"\s*:\s*"([^"]{8,30})"/)?.[1];
    if (joinedRaw) {
      const days = daysAgo(joinedRaw);
      if (days !== null) data.sellerAccountAge = days;
    }
  }

  return data;
}

function extractDepopData(html: string): Partial<ScrapedListing> {
  const data: Partial<ScrapedListing> = {};

  // Price — can be quoted ("29.99") or bare number
  const pm = html.match(/"price"\s*:\s*"?([\d.]+)"?/);
  if (pm) data.price = parseFloat(pm[1]);

  // ── __NEXT_DATA__ (primary path for all seller fields) ────────────────────
  try {
    const nd = getNextData(html);
    if (nd) {
      const pp = (nd.props as Record<string, unknown> | undefined)?.pageProps as Record<string, unknown> | undefined;
      // Product lives at pageProps.product OR pageProps.data depending on page type
      const product =
        (pp?.product as Record<string, unknown> | undefined) ??
        (pp?.data    as Record<string, unknown> | undefined);

      let s: Record<string, unknown> | null = null;
      if (product) {
        if (!data.price && product.price) data.price = parseFloat(String(product.price));
        s = (product.seller as Record<string, unknown> | undefined) ?? null;
      }
      // Deep-search fallback: handles alternate nesting on profile/shop pages
      if (!s) s = deepFindSeller(nd);

      if (s) {
        if (s.username)       data.sellerUsername    = String(s.username);
        if (s.reviewsTotal)   data.sellerReviewCount = parseInt(String(s.reviewsTotal), 10);
        if (s.reviewsAverage) data.sellerAvgRating   = parseFloat(String(s.reviewsAverage));
        if (s.verified)       data.sellerIsVerified  = Boolean(s.verified);
        // Timestamps may be Unix seconds (number) or ISO strings; daysAgo handles both
        const created = s.created ?? s.created_at ?? s.joined_at;
        if (created !== undefined && created !== null) {
          const days = daysAgo(created as string | number);
          if (days !== null) data.sellerAccountAge = days;
        }
      }
    }
  } catch { /* __NEXT_DATA__ missing or malformed — fall through to regex patterns */ }

  // ── Regex fallbacks ───────────────────────────────────────────────────────
  // sellerUsername: bare "username" key in Depop page JSON (not wrapped in object)
  if (!data.sellerUsername) {
    const un = html.match(/"username"\s*:\s*"([^"]{2,40})"/)?.[1];
    if (un) data.sellerUsername = un;
  }
  // sellerReviewCount: bare "reviewsTotal" integer
  if (data.sellerReviewCount === undefined) {
    const rt = html.match(/"reviewsTotal"\s*:\s*(\d+)/)?.[1];
    if (rt) data.sellerReviewCount = parseInt(rt, 10);
  }
  // sellerAvgRating: bare "reviewsAverage" float
  if (data.sellerAvgRating === undefined) {
    const ra = html.match(/"reviewsAverage"\s*:\s*([\d.]+)/)?.[1];
    if (ra) data.sellerAvgRating = parseFloat(ra);
  }
  // sellerIsVerified: bare "verified":true boolean flag
  if (data.sellerIsVerified === undefined) {
    if (/"verified"\s*:\s*true/.test(html)) data.sellerIsVerified = true;
  }
  // sellerAccountAge: ISO date string for any creation/join timestamp field
  if (data.sellerAccountAge === undefined) {
    const createdRaw =
      html.match(/"(?:created|created_at|joined_at)"\s*:\s*"([^"]{8,30})"/)?.[1];
    if (createdRaw) {
      const days = daysAgo(createdRaw);
      if (days !== null) data.sellerAccountAge = days;
    }
  }

  return data;
}

// ─── Platform detection ───────────────────────────────────────────────────────

export function detectPlatform(url: string): string {
  if (url.includes("ebay.com"))      return "ebay";
  if (url.includes("mercari.com"))   return "mercari";
  if (url.includes("facebook.com"))  return "facebook";
  if (url.includes("poshmark.com"))  return "poshmark";
  if (url.includes("depop.com"))     return "depop";
  return "manual";
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeListing(url: string): Promise<ScrapedListing | null> {
  const platform = detectPlatform(url);

  // Facebook needs its own flow
  if (url.includes("facebook.com")) {
    const result = await scrapeFacebook(url);
    return result ? { ...result, platform } : null;
  }

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

  let title:             string | undefined    = product?.["name"] as string | undefined;
  let description:       string | undefined    = product?.["description"] as string | undefined;
  let price:             number | null         = parsePrice(offer?.["price"] ?? offer?.["lowPrice"]);
  let imageUrls:         string[]              = [];
  let sellerUsername:    string | undefined;
  let sellerReviewCount: number | undefined;
  let sellerAvgRating:   number | undefined;
  let sellerIsVerified:  boolean | undefined;
  let category:          string | undefined;

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

  if (!price             && pd.price)             price             = pd.price;
  if (!sellerUsername    && pd.sellerUsername)    sellerUsername    = pd.sellerUsername;
  if (!description       && pd.description)       description       = pd.description;
  if (!sellerReviewCount && pd.sellerReviewCount) sellerReviewCount = pd.sellerReviewCount;
  if (!sellerAvgRating   && pd.sellerAvgRating)   sellerAvgRating   = pd.sellerAvgRating;
  if (sellerIsVerified === undefined && pd.sellerIsVerified !== undefined) sellerIsVerified = pd.sellerIsVerified;

  // 4. Last-resort price scan
  if (!price) price = priceFromText(html.replace(/<[^>]+>/g, " ").slice(0, 5000));

  // 5. Title fallback
  if (!title) {
    const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    if (pageTitle) title = decodeEntities(pageTitle.trim());
  }

  if (!title) return null;

  // Merge account age from platform-specific data
  const sellerAccountAge = pd.sellerAccountAge;

  return {
    title:            title.trim(),
    description:      (description ?? "").trim() || "No description available.",
    price:            price && price > 0 ? price : null,
    imageUrls:        [...new Set(imageUrls)].slice(0, 5),
    sellerUsername,
    sellerAccountAge,
    sellerReviewCount,
    sellerAvgRating,
    sellerIsVerified,
    category,
    platform,
    partial:          !price || price <= 0,
  };
}
