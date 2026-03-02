// ─── ListingShield — Facebook Marketplace content script ──────────────────────
// Runs on facebook.com/marketplace/item/* when the user is logged in.
// Extracts full listing + seller data from the Relay store JSON embedded in
// the page, then fetches the seller's marketplace profile for complete stats.

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

// Pull all inline script text that's related to marketplace data
function getRelayText() {
  return Array.from(document.querySelectorAll("script:not([src])"))
    .map((s) => s.textContent || "")
    .filter((t) => t.includes("marketplace") || t.includes("listing_price") || t.includes("redacted_description"))
    .join("\n");
}

// Find a JSON block starting at the key and return its raw content (handles nesting)
function extractBlock(text, key) {
  const idx = text.indexOf(`"${key}"`);
  if (idx === -1) return null;
  const start = text.indexOf("{", idx);
  if (start === -1) return null;
  let depth = 0, i = start;
  while (i < text.length) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
    i++;
  }
  return null;
}

// ─── Strategy 1: Listing page Relay store ────────────────────────────────────

function extractFromRelayStore() {
  const result = {
    sellerId:           null,
    title:              null,
    price:              null,
    description:        null,
    sellerUsername:     null,
    sellerAccountAge:   null,
    sellerReviewCount:  null,
    sellerAvgRating:    null,
    sellerIsVerified:   false,
    category:           null,
    imageUrls:          [],
    location:           null,
  };

  const combined = getRelayText();
  if (!combined) return result;

  // ── Title ────────────────────────────────────────────────────────────────
  const titleMatch = combined.match(
    /"(?:marketplace_listing_title|base_marketplace_listing_title)"\s*:\s*"((?:[^"\\]|\\.)*)"/
  );
  if (titleMatch) result.title = decodeRelayString(titleMatch[1]);

  // ── Price ────────────────────────────────────────────────────────────────
  const priceBlock = combined.match(/"listing_price"\s*:\s*\{[^}]{0,400}"amount"\s*:\s*"([\d.]+)"/);
  if (priceBlock) { const v = parseFloat(priceBlock[1]); if (v > 0) result.price = v; }

  if (!result.price) {
    const fmtMatch = combined.match(/"formatted_amount"\s*:\s*"\$([\d,]+(?:\.\d{1,2})?)"/);
    if (fmtMatch) result.price = parseFloat(fmtMatch[1].replace(/,/g, ""));
  }

  // ── Description ──────────────────────────────────────────────────────────
  const descMatch = combined.match(/"redacted_description"\s*:\s*\{"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (descMatch) result.description = decodeRelayString(descMatch[1]);

  // ── Seller block ─────────────────────────────────────────────────────────
  // FB embeds the full seller User node — extract the whole block first so
  // we can run sub-patterns against it without false-matching other users.
  const sellerBlock = extractBlock(combined, "marketplace_listing_seller") || "";

  // Seller ID
  const sellerIdMatch = sellerBlock.match(/"id"\s*:\s*"(\d{5,20})"/);
  if (sellerIdMatch) result.sellerId = sellerIdMatch[1];

  // Seller name
  const nameMatch = sellerBlock.match(/"name"\s*:\s*"([^"]{2,80})"/);
  if (nameMatch) result.sellerUsername = nameMatch[1];

  // ── marketplace_rating block (nested inside seller) ───────────────────────
  // Structure: "marketplace_rating":{"count":12,"average_overall_rating":4.8,...}
  const ratingBlock = extractBlock(sellerBlock, "marketplace_rating") ||
                      extractBlock(combined,    "marketplace_rating") || "";

  if (ratingBlock) {
    const countMatch = ratingBlock.match(/"count"\s*:\s*(\d+)/);
    if (countMatch) result.sellerReviewCount = parseInt(countMatch[1], 10);

    const avgMatch = ratingBlock.match(/"average_overall_rating"\s*:\s*([\d.]+)/);
    if (avgMatch) result.sellerAvgRating = parseFloat(avgMatch[1]);
  }

  // Fallback patterns if marketplace_rating block wasn't found
  if (!result.sellerReviewCount) {
    const m = (sellerBlock || combined).match(
      /"(?:seller_review_count|review_count|total_feedback_count|feedback_count|ratings_count)"\s*:\s*(\d+)/
    );
    if (m) result.sellerReviewCount = parseInt(m[1], 10);
  }
  if (!result.sellerAvgRating) {
    const m = (sellerBlock || combined).match(
      /"(?:seller_average_rating|average_overall_rating|average_star_rating|star_rating)"\s*:\s*([\d.]+)/
    );
    if (m) result.sellerAvgRating = parseFloat(m[1]);
  }

  // ── Registration date → account age ──────────────────────────────────────
  // "registration_date":{"time":1523456789,"timezone":0}
  const regBlock = extractBlock(sellerBlock, "registration_date") ||
                   extractBlock(combined,    "registration_date") || "";
  const timeMatch = regBlock.match(/"time"\s*:\s*(\d{9,11})/);
  if (timeMatch) result.sellerAccountAge = daysAgo(parseInt(timeMatch[1], 10));

  if (result.sellerAccountAge === null) {
    // Text fallback: "Member since March 2019"
    const msMatch = (sellerBlock || combined).match(/[Mm]ember since ([A-Z][a-z]+ \d{4})/);
    if (msMatch) {
      const d = new Date(msMatch[1]);
      if (!isNaN(d.getTime())) result.sellerAccountAge = daysAgo(d.getTime() / 1000);
    }
  }

  // ── Verified status ───────────────────────────────────────────────────────
  result.sellerIsVerified =
    /"is_verified_user"\s*:\s*true/.test(sellerBlock || combined) ||
    /"id_verified"\s*:\s*true/.test(sellerBlock || combined) ||
    /"is_verified"\s*:\s*true/.test(sellerBlock);

  // ── Category ─────────────────────────────────────────────────────────────
  const catMatch = combined.match(/"marketplace_listing_category_name"\s*:\s*"([^"]{3,60})"/);
  if (catMatch) result.category = catMatch[1];

  // ── Location ─────────────────────────────────────────────────────────────
  const locMatch = combined.match(/"location_text"\s*:\s*\{"text"\s*:\s*"([^"]{2,80})"/);
  if (locMatch) result.location = locMatch[1];

  // ── Images ───────────────────────────────────────────────────────────────
  const imgRegex = /"uri"\s*:\s*"(https:\/\/[^"]*(?:scontent|fbcdn)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/g;
  const seen = new Set();
  let m;
  while ((m = imgRegex.exec(combined)) !== null) {
    const uri = decodeRelayString(m[1]);
    if (!seen.has(uri) && uri.length < 500) seen.add(uri);
  }
  result.imageUrls = Array.from(seen).slice(0, 6);

  return result;
}

// ─── Strategy 2: Seller marketplace profile page ──────────────────────────────
// facebook.com/marketplace/profile/SELLER_ID has the full seller stats
// (rating, review count, member since) in its own Relay store.
// Since the content script runs in the FB origin, fetch() includes cookies.

async function fetchSellerProfile(sellerId) {
  const result = {
    sellerReviewCount: null,
    sellerAvgRating:   null,
    sellerAccountAge:  null,
    sellerIsVerified:  false,
    itemsForSale:      null,
  };

  try {
    const res = await fetch(`https://www.facebook.com/marketplace/profile/${sellerId}`, {
      credentials: "include",
      headers: { "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) return result;
    const html = await res.text();

    // Seller profile pages have their own Relay store
    const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    const combined = scripts
      .map((s) => s.replace(/<\/?script[^>]*>/g, ""))
      .filter((t) => t.includes("marketplace_rating") || t.includes("registration_date") || t.includes("seller"))
      .join("\n");

    // marketplace_rating block on the profile page
    const ratingBlock = extractBlock(combined, "marketplace_rating") || "";
    if (ratingBlock) {
      const countMatch = ratingBlock.match(/"count"\s*:\s*(\d+)/);
      if (countMatch) result.sellerReviewCount = parseInt(countMatch[1], 10);

      const avgMatch = ratingBlock.match(/"average_overall_rating"\s*:\s*([\d.]+)/);
      if (avgMatch) result.sellerAvgRating = parseFloat(avgMatch[1]);

      // Separate buyer/seller counts
      const sellerCountMatch = ratingBlock.match(/"seller_review_count"\s*:\s*(\d+)/);
      if (sellerCountMatch && !result.sellerReviewCount) {
        result.sellerReviewCount = parseInt(sellerCountMatch[1], 10);
      }
    }

    // Registration date
    const regBlock = extractBlock(combined, "registration_date") || "";
    const timeMatch = regBlock.match(/"time"\s*:\s*(\d{9,11})/);
    if (timeMatch) result.sellerAccountAge = daysAgo(parseInt(timeMatch[1], 10));

    // Verified
    result.sellerIsVerified =
      /"is_verified_user"\s*:\s*true/.test(combined) ||
      /"id_verified"\s*:\s*true/.test(combined);

    // Items for sale count (extra context for the analyst)
    const itemsMatch = combined.match(/"(?:items_for_sale_count|active_listing_count)"\s*:\s*(\d+)/);
    if (itemsMatch) result.itemsForSale = parseInt(itemsMatch[1], 10);

    // Text fallbacks on the rendered profile page
    if (!result.sellerReviewCount) {
      const m = html.match(/(\d+)\s+(?:rating|review|feedback)/i);
      if (m) result.sellerReviewCount = parseInt(m[1], 10);
    }
    if (!result.sellerAccountAge) {
      const m = html.match(/[Mm]ember since ([A-Z][a-z]+ \d{4})/);
      if (m) {
        const d = new Date(m[1]);
        if (!isNaN(d.getTime())) result.sellerAccountAge = daysAgo(d.getTime() / 1000);
      }
    }

  } catch {
    // Network error — return whatever we have
  }

  return result;
}

// ─── Strategy 3: DOM fallbacks ────────────────────────────────────────────────

function extractFromDOM() {
  const result = { title: null, price: null, description: null, sellerUsername: null, imageUrls: [] };

  const h1 = document.querySelector("h1");
  if (h1) result.title = h1.textContent.trim();

  for (const el of document.querySelectorAll("span, div")) {
    const text = (el.textContent || "").trim();
    if (/^\$[\d,]+(\.\d{1,2})?$/.test(text)) {
      result.price = parseFloat(text.replace(/[$,]/g, ""));
      break;
    }
  }

  let longest = "";
  for (const el of document.querySelectorAll('[dir="auto"]')) {
    const text = (el.textContent || "").trim();
    if (text.length > longest.length && text.length < 5000 && text.length > 30 && text !== result.title) {
      longest = text;
    }
  }
  if (longest) result.description = longest;

  const profileLink = document.querySelector('a[href*="/marketplace/profile/"]');
  if (profileLink) {
    const m = (profileLink.getAttribute("href") || "").match(/\/marketplace\/profile\/([^/?#]+)/);
    result.sellerUsername = m ? m[1] : (profileLink.textContent || "").trim() || null;
  }

  const imgSet = new Set();
  for (const img of document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]')) {
    if ((img.naturalWidth || img.width) > 200 && img.src) imgSet.add(img.src);
  }
  result.imageUrls = Array.from(imgSet).slice(0, 6);

  return result;
}

// ─── Merge all sources ────────────────────────────────────────────────────────

async function extractListingData() {
  const relay = extractFromRelayStore();
  const dom   = extractFromDOM();

  // Fetch seller profile page in parallel if we have a seller ID
  const profilePromise = relay.sellerId
    ? fetchSellerProfile(relay.sellerId)
    : Promise.resolve({});

  const profile = await profilePromise;

  // Prefer profile page data for seller stats (more complete),
  // fall back to listing page relay data, then DOM
  return {
    url:               window.location.href,
    platform:          "facebook",
    title:             relay.title             ?? dom.title,
    price:             relay.price             ?? dom.price,
    description:       relay.description       ?? dom.description,
    category:          relay.category          ?? null,
    imageUrls:         relay.imageUrls.length  ? relay.imageUrls : dom.imageUrls,
    sellerUsername:    relay.sellerUsername     ?? dom.sellerUsername,
    sellerAccountAge:  profile.sellerAccountAge  ?? relay.sellerAccountAge  ?? null,
    sellerReviewCount: profile.sellerReviewCount ?? relay.sellerReviewCount ?? null,
    sellerAvgRating:   profile.sellerAvgRating   ?? relay.sellerAvgRating   ?? null,
    sellerIsVerified:  profile.sellerIsVerified  || relay.sellerIsVerified  || false,
    location:          relay.location           ?? null,
    // Extra context (not in form, but useful for analysis)
    _sellerId:         relay.sellerId,
    _itemsForSale:     profile.itemsForSale ?? null,
  };
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_LISTING") {
    extractListingData()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: String(err) }));
  }
  return true; // keep channel open for async response
});
