import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [analyses, flags] = await Promise.all([
      db.listingAnalysis.findMany({
        select: { trustScore: true, platform: true },
      }),
      db.riskFlag.findMany({ select: { flagType: true } }),
    ]);

    const totalAnalyzed = analyses.length;
    const avgScore =
      totalAnalyzed > 0
        ? Math.round(
            analyses.reduce(
              (s: number, a: { trustScore: number; platform: string }) =>
                s + a.trustScore,
              0
            ) / totalAnalyzed
          )
        : 0;

    const flagBreakdown = flags.reduce<Record<string, number>>(
      (acc: Record<string, number>, f: { flagType: string }) => {
        acc[f.flagType] = (acc[f.flagType] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const platformBreakdown = analyses.reduce<Record<string, number>>(
      (acc: Record<string, number>, a: { trustScore: number; platform: string }) => {
        acc[a.platform] = (acc[a.platform] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      totalAnalyzed,
      avgScore,
      flagBreakdown,
      platformBreakdown,
    });
  } catch (err) {
    console.error("[GET /api/stats]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
