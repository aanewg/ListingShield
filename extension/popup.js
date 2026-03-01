// ─── ListingShield popup ──────────────────────────────────────────────────────
"use strict";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function show(id)    { document.getElementById(id)?.classList.remove("hidden"); }
function hide(id)    { document.getElementById(id)?.classList.add("hidden"); }
function el(id)      { return document.getElementById(id); }
function send(msg)   { return new Promise((res) => chrome.runtime.sendMessage(msg, res)); }

function isFbMarketplaceItem(url) {
  return /facebook\.com\/marketplace\/item\/\d+/.test(url);
}

function fmt(value, label) {
  const ok = value !== null && value !== undefined && value !== false && value !== "";
  return `
    <div class="field-row">
      <span class="${ok ? "check" : "miss"}">${ok ? "✓" : "–"}</span>
      <span>${label}${ok && typeof value !== "boolean" ? `: <span class="val">${String(value).slice(0, 60)}</span>` : ""}</span>
    </div>`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load settings
  const settings = await send({ type: "GET_SETTINGS" });
  el("ls-url-input").value = settings.listingShieldUrl || "http://localhost:3333";

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  const isListing = isFbMarketplaceItem(url);

  // Show URL in listing card
  if (isListing) {
    const itemId = url.match(/marketplace\/item\/(\d+)/)?.[1] ?? "";
    el("listing-url-preview").textContent = `marketplace/item/${itemId}`;
  }

  // Check FB login status
  const { loggedIn } = await send({ type: "CHECK_FB_LOGIN" });

  // ── Show FB connection state ──────────────────────────────────────────────
  hide("fb-checking");
  if (loggedIn) {
    show("fb-connected");
  } else {
    show("fb-disconnected");
  }

  // ── Show page state ───────────────────────────────────────────────────────
  if (!isListing) {
    show("page-not-listing");
  } else if (!loggedIn) {
    show("page-needs-login");
  } else {
    show("page-ready");
  }
}

// ─── Button handlers ──────────────────────────────────────────────────────────

el("btn-fb-login").addEventListener("click", () => {
  send({ type: "OPEN_FACEBOOK_LOGIN" });
  window.close();
});

el("btn-logout").addEventListener("click", async () => {
  // There's no way to programmatically log out — direct user to FB
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.create({ url: "https://www.facebook.com" });
  window.close();
});

el("btn-analyze").addEventListener("click", async () => {
  const btn = el("btn-analyze");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Extracting…';
  hide("extract-error");
  hide("extracted-preview");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Make sure the content script is injected (in case the user navigated after page load)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files:  ["content.js"],
    });
  } catch {
    // Already injected — ignore
  }

  // Ask content script to extract
  chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_LISTING" }, async (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      const errMsg = chrome.runtime.lastError?.message || response?.error || "Could not extract listing data.";
      el("extract-error").textContent = errMsg;
      show("extract-error");
      btn.disabled = false;
      btn.innerHTML = "Extract &amp; Analyze Listing";
      return;
    }

    const data = response.data;

    // Show extracted fields preview
    const hasTitle   = !!data.title;
    const hasPrice   = data.price !== null;
    const hasDesc    = !!data.description;
    const hasSeller  = !!data.sellerUsername;
    const hasAge     = data.sellerAccountAge !== null;
    const hasImgs    = data.imageUrls?.length > 0;

    el("field-list").innerHTML = [
      fmt(data.title,             "Title"),
      fmt(hasPrice ? `$${data.price}` : null, "Price"),
      fmt(data.description,       "Description"),
      fmt(hasSeller ? data.sellerUsername : null, "Seller"),
      fmt(hasAge ? `${data.sellerAccountAge} days` : null, "Account age"),
      fmt(hasImgs ? `${data.imageUrls.length} image(s)` : null, "Images"),
    ].join("");

    show("extracted-preview");

    if (!hasTitle || !hasDesc) {
      // Couldn't get the basics — possibly not fully loaded or not logged in
      el("listing-status-text").textContent = "Partial data — open the form to complete.";
    } else {
      el("listing-status-text").textContent = "Data extracted — opening ListingShield…";
    }

    // Open ListingShield analyze page with encoded data
    await send({ type: "OPEN_LISTING_SHIELD", data });

    btn.disabled = false;
    btn.textContent = "Opened — analyze again";
  });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

el("settings-toggle").addEventListener("click", () => {
  el("settings-panel").classList.toggle("open");
});

el("btn-save-settings").addEventListener("click", async () => {
  const url = el("ls-url-input").value.trim().replace(/\/$/, "");
  if (!url) return;
  await send({ type: "SAVE_SETTINGS", listingShieldUrl: url });
  show("settings-saved");
  setTimeout(() => hide("settings-saved"), 2000);
});

// ─── Run ──────────────────────────────────────────────────────────────────────

init().catch(console.error);
