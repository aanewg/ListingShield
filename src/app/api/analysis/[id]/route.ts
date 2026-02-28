import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const analysis = await db.listingAnalysis.findUnique({
      where: { id },
      include: { riskFlags: true },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }

    return NextResponse.json({
      ...analysis,
      imageUrls: analysis.imageUrls ? JSON.parse(analysis.imageUrls) : [],
    });
  } catch (err) {
    console.error("[GET /api/analysis/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
