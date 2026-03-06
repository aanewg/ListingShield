import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  sanitizeStr,
  VALID_PLATFORMS,
  VALID_REPORT_TYPES,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 5 reports / minute / IP ─────────────────────────────────
    const ip = getClientIp(req.headers);
    if (!checkRateLimit(`report:${ip}`, 5)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const { listingUrl, platform, reportType, details } = await req.json();

    if (!listingUrl || !platform || !reportType) {
      return NextResponse.json(
        { error: "listingUrl, platform, and reportType are required." },
        { status: 400 }
      );
    }

    // ── Input validation ─────────────────────────────────────────────────────
    if (!VALID_PLATFORMS.has(platform)) {
      return NextResponse.json(
        { error: "platform must be one of: facebook, ebay, mercari, poshmark, depop, other." },
        { status: 400 }
      );
    }

    if (!VALID_REPORT_TYPES.has(reportType)) {
      return NextResponse.json(
        { error: "reportType must be one of: scam, counterfeit, fake_reviews, bait_switch, other." },
        { status: 400 }
      );
    }

    const cleanUrl     = sanitizeStr(listingUrl, 2048);
    const cleanDetails = sanitizeStr(details,    5_000);

    if (!cleanUrl) {
      return NextResponse.json(
        { error: "listingUrl is required." },
        { status: 400 }
      );
    }

    const report = await db.userReport.create({
      data: {
        listingUrl: cleanUrl,
        platform,
        reportType,
        details: cleanDetails ?? null,
      },
    });

    return NextResponse.json({ id: report.id, success: true });
  } catch (err) {
    console.error("[POST /api/report]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
