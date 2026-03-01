import { NextRequest, NextResponse } from "next/server";
import { scrapeListing } from "@/lib/scraper";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url?: string };

    if (!url?.trim()) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const scraped = await scrapeListing(url.trim());

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
