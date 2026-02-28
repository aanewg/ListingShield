import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { listingUrl, platform, reportType, details } = await req.json();

    if (!listingUrl || !platform || !reportType) {
      return NextResponse.json(
        { error: "listingUrl, platform, and reportType are required." },
        { status: 400 }
      );
    }

    const report = await db.userReport.create({
      data: { listingUrl, platform, reportType, details: details ?? null },
    });

    return NextResponse.json({ id: report.id, success: true });
  } catch (err) {
    console.error("[POST /api/report]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
