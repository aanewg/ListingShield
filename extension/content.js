// ─── ListingShield — Facebook Marketplace content script ──────────────────────
// Runs on facebook.com/marketplace/item/* when the user is logged in.
// Extracts full listing data from the Relay store JSON embedded in the page,
// with DOM fallbacks for anything the store doesn't expose.

"use strict";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeRelayString(str) {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function daysAgo(unixSeconds) {
  const ms = Date.now() - unixSeconds * 1000;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// ─── Strategy 1: Relay store JSON from inline scripts ─────────────────────────
// When logged in, Facebook embeds the full GraphQL response in <script> tags.
// This gives us price, full description, seller registration date, and more.

function extractFromRelayStore() {
  const result = {
    title:                  null,
    price:                  null,
    description:            null,
    sellerUsername:         null,
    sellerAccountAge:       null,
    sellerReviewCount:      null,
    sellerAvgRating:        null,
    sellerIsVerified:       null,
    category:               null,
    imageUrls:              [],
    location:               null,
  };

  // Collect all inline script content
  const scripts = Array.from(document.querySelectorAll("script:not([src])"));
  // Only search scripts likely to contain listing data (large inline blocks)
  const combined = scripts
    .map((s) => s.textContent || "")
    .filter((t) => t.includes("marketplace") || t.includes("listing_price"))
    .join("\n");

  if (!combined) return result;

  // ── Title ────────────────────────────────────────────────────────────────
  const titleMatch =
    combined.match(/"(?:marketplace_listing_title|base_marketplace_listing_title)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (titleMatch) result.title = decodeRelayString(titleMatch[1]);

  // ── Price ────────────────────────────────────────────────────────────────
  // Full price block: "listing_price":{"formatted_amount":"$40","amount":"40.00","currency":"USD"}
  const priceBlock = combined.match(
    /"listing_price"\s*:\s*\{[^}]{0,300}"amount"\s*:\s*"([\d.]+)"/
  );
  if (priceBlock) {
    const v = parseFloat(priceBlock[1]);
    if (v > 0) result.price = v;
  }
  // Fallback: formatted_amount with $ sign
  if (!result.price) {
    const fmtMatch = combined.match(/"formatted_amount"\s*:\s*"\$([\d,]+(?:\.\d{1,2})?)"/);
    if (fmtMatch) result.price = parseFloat(fmtMatch[1].replace(/,/g, ""));
  }

  // ── Description ──────────────────────────────────────────────────────────
  const descMatch = combined.match(/"redacted_description"\s*:\s*\{"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (descMatch) result.description = decodeRelayString(descMatch[1]);

  // ── Seller ───────────────────────────────────────────────────────────────
  // Name
  const sellerNameMatch = combined.match(
    /"marketplace_listing_seller"\s*:\s*\{[^}]{0,400}"name"\s*:\s*"([^"]{2,60})"/
  );
  if (sellerNameMatch) result.sellerUsername = sellerNameMatch[1];

  // Registration date (Unix timestamp) → account age in days
  const regDateMatch = combined.match(/"registration_date"\s*:\s*\{[^}]{0,100}"time"\s*:\s*(\d{9,11})/);
  if (regDateMatch) {
    result.sellerAccountAge = daysAgo(parseInt(regDateMatch[1], 10));
  }
  // Fallback text: "Member since March 2019"
  if (result.sellerAccountAge === null) {
    const memberSinceMatch = combined.match(/[Mm]ember since ([A-Z][a-z]+ \d{4})/);
    if (memberSinceMatch) {
      const d = new Date(memberSinceMatch[1]);
      if (!isNaN(d.getTime())) result.sellerAccountAge = daysAgo(d.getTime() / 1000);
    }
  }

  // Seller reputation / review count
  const repMatch = combined.match(/"seller_review_count"\s*:\s*(\d+)/);
  if (repMatch) result.sellerReviewCount = parseInt(repMatch[1], 10);

  // Average rating (0–5)
  const ratingMatch = combined.match(/"seller_average_rating"\s*:\s*([\d.]+)/);
  if (ratingMatch) result.sellerAvgRating = parseFloat(ratingMatch[1]);

  // ID-verified badge
  result.sellerIsVerified = /"is_verified_user"\s*:\s*true/.test(combined) ||
                             /"id_verified"\s*:\s*true/.test(combined);

  // ── Category ─────────────────────────────────────────────────────────────
  const catMatch = combined.match(/"marketplace_listing_category_name"\s*:\s*"([^"]{3,60})"/);
  if (catMatch) result.category = catMatch[1];

  // ── Location ─────────────────────────────────────────────────────────────
  const locMatch = combined.match(/"location_text"\s*:\s*\{"text"\s*:\s*"([^"]{2,80})"/);
  if (locMatch) result.location = locMatch[1];

  // ── Images ───────────────────────────────────────────────────────────────
  // FB CDN images in the Relay store
  const imgRegex = /"uri"\s*:\s*"(https:\/\/[^"]*(?:scontent|fbcdn)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/g;
  const seen = new Set();
  let imgMatch;
  while ((imgMatch = imgRegex.exec(combined)) !== null) {
    const uri = decodeRelayString(imgMatch[1]);
    // Filter out tiny icons/avatars by checking for _n.jpg suffix (large images)
    if (!seen.has(uri) && uri.length < 500) {
      seen.add(uri);
    }
  }
  result.imageUrls = Array.from(seen).slice(0, 6);

  return result;
}

// ─── Strategy 2: DOM fallbacks ────────────────────────────────────────────────
// Used when the Relay store didn't have a field.

function extractFromDOM() {
  const result = {
    title:       null,
    price:       null,
    description: null,
    sellerUsername: null,
    imageUrls:   [],
  };

  // Title — first h1 on the page (FB puts item title in h1)
  const h1 = document.querySelector("h1");
  if (h1) result.title = h1.textContent.trim();

  // Price — find a span whose full text is a dollar amount
  const allSpans = Array.from(document.querySelectorAll("span, div"));
  for (const el of allSpans) {
    const text = (el.textContent || "").trim();
    if (/^\$[\d,]+(\.\d{1,2})?$/.test(text)) {
      result.price = parseFloat(text.replace(/[$,]/g, ""));
      break;
    }
  }

  // Description — longest [dir="auto"] block that isn't the title
  let longest = "";
  for (const el of document.querySelectorAll('[dir="auto"]')) {
    const text = (el.textContent || "").trim();
    if (text.length > longest.length && text.length < 5000 && text.length > 30) {
      if (text !== result.title) longest = text;
    }
  }
  if (longest) result.description = longest;

  // Seller username from a profile link
  const profileLink = document.querySelector('a[href*="/marketplace/profile/"]');
  if (profileLink) {
    const href = profileLink.getAttribute("href") || "";
    const m = href.match(/\/marketplace\/profile\/([^/?#]+)/);
    if (m) result.sellerUsername = m[1];
    else result.sellerUsername = (profileLink.textContent || "").trim() || null;
  }

  // Images — large CDN images visible on the page
  const imgs = Array.from(document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]'));
  const imgSet = new Set();
  for (const img of imgs) {
    if ((img.naturalWidth || img.width) > 200 && img.src) imgSet.add(img.src);
  }
  result.imageUrls = Array.from(imgSet).slice(0, 6);

  return result;
}

// ─── Merge & return ───────────────────────────────────────────────────────────

function extractListingData() {
  const relay = extractFromRelayStore();
  const dom   = extractFromDOM();

  return {
    url:               window.location.href,
    platform:          "facebook",
    title:             relay.title             ?? dom.title,
    price:             relay.price             ?? dom.price,
    description:       relay.description       ?? dom.description,
    category:          relay.category          ?? null,
    imageUrls:         relay.imageUrls.length  ? relay.imageUrls : dom.imageUrls,
    sellerUsername:    relay.sellerUsername     ?? dom.sellerUsername,
    sellerAccountAge:  relay.sellerAccountAge  ?? null,
    sellerReviewCount: relay.sellerReviewCount ?? null,
    sellerAvgRating:   relay.sellerAvgRating   ?? null,
    sellerIsVerified:  relay.sellerIsVerified  ?? false,
    location:          relay.location          ?? null,
  };
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_LISTING") {
    try {
      const data = extractListingData();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
  }
  return true; // keep channel open for async
});
