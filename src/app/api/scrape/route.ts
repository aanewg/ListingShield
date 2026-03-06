import { NextRequest, NextResponse } from "next/server";
import { scrapeListing } from "@/lib/scraper";
import {
  isAllowedMarketplaceUrl,
  checkRateLimit,
  getClientIp,
  sanitizeStr,
} from "@/lib/security";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 20 requests / minute / IP ────────────────────────────────
    const ip = getClientIp(req.headers);
    if (!checkRateLimit(`scrape:${ip}`, 20)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const { url: rawUrl } = await req.json() as { url?: string };

    const url = sanitizeStr(rawUrl?.trim(), 2048);

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // ── SSRF guard ───────────────────────────────────────────────────────────
    if (!isAllowedMarketplaceUrl(url)) {
      return NextResponse.json(
        {
          error:
            "URL must be from a supported marketplace (eBay, Mercari, Facebook Marketplace, Poshmark, or Depop) and use https://.",
        },
        { status: 400 }
      );
    }

    const scraped = await scrapeListing(url);

    if (!scraped) {
      return NextResponse.json(
        { error: "SCRAPE_FAILED", message: "Could not read this listing automatically. Try a different URL or fill in the details manually." },
        { status: 422 }
      );
    }

    return NextResponse.json(scraped);
  } catch (err) {
    console.error("[POST /api/scrape]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
