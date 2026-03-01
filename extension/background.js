// ─── ListingShield — background service worker ────────────────────────────────
"use strict";

const DEFAULT_LS_URL = "http://localhost:3333";

async function getListingShieldUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["listingShieldUrl"], (res) => {
      resolve(res.listingShieldUrl || DEFAULT_LS_URL);
    });
  });
}

async function isFacebookLoggedIn() {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: "https://www.facebook.com", name: "c_user" }, (cookie) => {
      resolve(!!cookie);
    });
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHECK_FB_LOGIN") {
    isFacebookLoggedIn().then((loggedIn) => sendResponse({ loggedIn }));
    return true;
  }

  if (message.type === "OPEN_FACEBOOK_LOGIN") {
    chrome.tabs.create({ url: "https://www.facebook.com/login" });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "OPEN_LISTING_SHIELD") {
    // data is the extracted listing — encode as base64 JSON and open the analyze page
    getListingShieldUrl().then((lsUrl) => {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(message.data))));
      const url = `${lsUrl}/analyze?d=${encoded}`;
      chrome.tabs.create({ url });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    getListingShieldUrl().then((url) => sendResponse({ listingShieldUrl: url }));
    return true;
  }

  if (message.type === "SAVE_SETTINGS") {
    chrome.storage.local.set({ listingShieldUrl: message.listingShieldUrl }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
