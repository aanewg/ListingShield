import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { TrustScoreGauge } from "@/components/TrustScoreGauge";
import { RiskFlagCard } from "@/components/RiskFlagCard";
import { PriceAnalysis } from "@/components/PriceAnalysis";
import { SellerProfile } from "@/components/SellerProfile";
import { DescriptionAnalysis } from "@/components/DescriptionAnalysis";
import { AIAnalysis } from "@/components/AIAnalysis";
import type { TrustTier, DetectedFlag } from "@/types";
import type { AIAnalysisResult } from "@/lib/ai-analysis";

// ─── Tier display config ───────────────────────────────────────────────────────

const TIER_CONFIG: Record<
  TrustTier,
  { label: string; bg: string; text: string; border: string; summary: string }
> = {
  highly_trusted: {
    label: "Highly Trusted",
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
    summary: "This listing shows strong positive signals. Reasonable to proceed — always use platform buyer protections.",
  },
  looks_good: {
    label: "Looks Good",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/30",
    summary: "No major red flags detected. A few minor items to watch, but the listing appears legitimate.",
  },
  caution: {
    label: "Proceed with Caution",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    summary: "Some suspicious signals detected. Ask the seller questions and verify before purchasing.",
  },
  risky: {
    label: "Risky",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    summary: "Multiple red flags found. This listing has a high likelihood of being a scam or counterfeit.",
  },
  likely_scam: {
    label: "Likely Scam",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    summary: "Critical warning signs detected. Do not purchase — this listing matches known scam patterns.",
  },
};

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    ebay:      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    mercari:   "bg-red-500/10 text-red-400 border-red-500/20",
    facebook:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
    poshmark:  "bg-pink-500/10 text-pink-400 border-pink-500/20",
    depop:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
    manual:    "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  const cls = colors[platform] ?? colors.manual;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold mono uppercase ${cls}`}>
      {platform}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const analysis = await db.listingAnalysis.findUnique({
    where: { id },
    include: { riskFlags: true },
  });

  if (!analysis) notFound();

  const tier = analysis.trustTier as TrustTier;
  const tierCfg = TIER_CONFIG[tier];

  const aiAnalysis: AIAnalysisResult | null = analysis.aiAnalysis
    ? JSON.parse(analysis.aiAnalysis as string) as AIAnalysisResult
    : null;

  const flags: DetectedFlag[] = analysis.riskFlags.map((f) => ({
    flagType: f.flagType as DetectedFlag["flagType"],
    severity: f.severity as DetectedFlag["severity"],
    title: f.title,
    description: f.description,
    confidence: f.confidence,
  }));

  // Sort flags: critical → high → medium → low
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedFlags = [...flags].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  const criticalCount = flags.filter((f) => f.severity === "critical").length;
  const highCount     = flags.filter((f) => f.severity === "high").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* ── Verdict Banner ───────────────────────────────────────────────────── */}
      <div className={`mb-8 rounded-xl border ${tierCfg.border} ${tierCfg.bg} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <PlatformBadge platform={analysis.platform} />
              <span className="text-xs text-slate-500 mono">
                {new Date(analysis.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mb-1 line-clamp-2">{analysis.title}</h1>
            <p className="text-sm text-slate-400">{tierCfg.summary}</p>
          </div>

          <div className={`shrink-0 rounded-full border ${tierCfg.border} px-5 py-2 ${tierCfg.bg}`}>
            <span className={`text-lg font-bold ${tierCfg.text}`}>{tierCfg.label}</span>
          </div>
        </div>

        {/* Flag count summary */}
        {flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 pt-4 border-t border-[#1e2a3f]">
            <span className="text-xs text-slate-500">
              {flags.length} flag{flags.length !== 1 ? "s" : ""} detected
            </span>
            {criticalCount > 0 && (
              <span className="text-xs rounded px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 mono">
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="text-xs rounded px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 mono">
                {highCount} high
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — Gauge + Price + Seller */}
        <div className="flex flex-col gap-6">
          {/* Trust Gauge */}
          <div className="card flex flex-col items-center py-6">
            <p className="text-xs text-slate-500 mono uppercase tracking-widest mb-5">Trust Score</p>
            <TrustScoreGauge score={analysis.trustScore} tier={tier} />

            {/* Listing price */}
            <div className="mt-6 w-full border-t border-[#1e2a3f] pt-4 flex justify-between items-center">
              <span className="text-xs text-slate-500 mono">LISTING PRICE</span>
              <span className="text-xl font-bold text-white mono">${analysis.price.toFixed(2)}</span>
            </div>
            {analysis.listingUrl && (
              <a
                href={analysis.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full text-center rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
              >
                View Original Listing →
              </a>
            )}
          </div>

          {/* Price analysis */}
          <PriceAnalysis
            listingPrice={analysis.price}
            marketAvgPrice={analysis.marketAvgPrice}
            deviationPercent={
              analysis.marketAvgPrice
                ? ((analysis.price - analysis.marketAvgPrice) / analysis.marketAvgPrice) * 100
                : null
            }
          />

          {/* Seller profile */}
          <SellerProfile
            username={analysis.sellerUsername}
            accountAge={analysis.sellerAccountAge}
            reviewCount={analysis.sellerReviewCount}
            avgRating={analysis.sellerAvgRating}
            isVerified={analysis.sellerIsVerified}
          />
        </div>

        {/* Right column — Risk flags + Description */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Risk flags */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Risk Flags
              </h2>
              <span className="mono text-xs text-slate-500">
                {flags.length} detected
              </span>
            </div>

            {sortedFlags.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2} className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-green-400 font-semibold text-sm">No flags detected</p>
                <p className="text-slate-500 text-xs mt-1">This listing passed all automated checks.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedFlags.map((flag, i) => (
                  <RiskFlagCard key={i} flag={flag} />
                ))}
              </div>
            )}
          </div>

          {/* Description analysis */}
          <DescriptionAnalysis
            title={analysis.title}
            description={analysis.description}
            wordCount={analysis.description.trim().split(/\s+/).filter(Boolean).length}
            qualityScore={
              // Reconstruct quality score from flags
              Math.max(
                0,
                100 - flags
                  .filter((f) => ["SHORT_DESCRIPTION","VAGUE_DESCRIPTION","KEYWORD_STUFFING","OFF_PLATFORM_LANGUAGE","NO_AUTHENTICITY_PROOF","CATEGORY_MISMATCH"].includes(f.flagType))
                  .reduce((acc, f) => acc + (
                    f.severity === "critical" ? 40 :
                    f.severity === "high"     ? 20 :
                    f.severity === "medium"   ? 12 : 8
                  ), 0)
              )
            }
          />

          {/* AI Analysis */}
          {aiAnalysis && (
            <AIAnalysis
              analysis={aiAnalysis}
              ruleScore={Math.round((analysis.trustScore - aiAnalysis.aiScore * 0.6) / 0.4)}
            />
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="flex-1 sm:flex-none rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors text-center"
            >
              + Analyze Another
            </Link>
            <Link
              href={`/report?listing=${encodeURIComponent(analysis.listingUrl ?? "")}&platform=${analysis.platform}`}
              className="flex-1 sm:flex-none rounded-lg border border-[#1e2a3f] bg-[#0d1117] px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-center"
            >
              Report This Listing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
