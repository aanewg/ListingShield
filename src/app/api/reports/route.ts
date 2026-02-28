import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const reports = await db.userReport.findMany({
      where: {
        ...(platform ? { platform } : {}),
        ...(type ? { reportType: type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[GET /api/reports]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
