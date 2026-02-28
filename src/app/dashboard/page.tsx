import Link from "next/link";
import { db } from "@/lib/db";
import { DashboardCharts } from "@/components/DashboardCharts";
import type { TrustTier } from "@/types";

export const metadata = { title: "Dashboard — ListingShield" };

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getStats() {
  const [
    totalAnalyzed,
    totalReports,
    scoreRows,
    flagRows,
    platformRows,
    tierRows,
  ] = await Promise.all([
    db.listingAnalysis.count(),
    db.userReport.count(),
    db.listingAnalysis.findMany({ select: { trustScore: true } }),
    db.riskFlag.groupBy({ by: ["flagType"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    db.listingAnalysis.groupBy({ by: ["platform"], _count: { id: true } }),
    db.listingAnalysis.groupBy({ by: ["trustTier"], _count: { id: true } }),
  ]);

  const avgScore =
    scoreRows.length === 0
      ? 0
      : Math.round(scoreRows.reduce((sum, r) => sum + r.trustScore, 0) / scoreRows.length);

  const flagBreakdown: Record<string, number> = {};
  for (const row of flagRows) flagBreakdown[row.flagType] = row._count.id;

  const platformBreakdown: Record<string, number> = {};
  for (const row of platformRows) platformBreakdown[row.platform] = row._count.id;

  const tierBreakdown: Record<string, number> = {};
  for (const row of tierRows) tierBreakdown[row.trustTier] = row._count.id;

  const totalFlags = flagRows.reduce((sum, r) => sum + r._count.id, 0);

  return { totalAnalyzed, totalReports, avgScore, flagBreakdown, platformBreakdown, tierBreakdown, totalFlags };
}

async function getRecentAnalyses() {
  return db.listingAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id:         true,
      title:      true,
      platform:   true,
      price:      true,
      trustScore: true,
      trustTier:  true,
      createdAt:  true,
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<TrustTier, { label: string; color: string; bg: string; border: string }> = {
  highly_trusted: { label: "Highly Trusted", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
  looks_good:     { label: "Looks Good",     color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/20"   },
  caution:        { label: "Caution",        color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  risky:          { label: "Risky",          color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  likely_scam:    { label: "Likely Scam",    color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
};

const PLATFORM_COLORS: Record<string, string> = {
  mercari:  "text-red-400",
  ebay:     "text-yellow-400",
  facebook: "text-blue-400",
  poshmark: "text-pink-400",
  depop:    "text-purple-400",
  manual:   "text-slate-400",
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ScoreChip({ score }: { score: number }) {
  const color =
    score >= 90 ? "text-green-400 bg-green-500/10 border-green-500/20" :
    score >= 70 ? "text-teal-400 bg-teal-500/10 border-teal-500/20" :
    score >= 50 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
    score >= 30 ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
                  "text-red-400 bg-red-500/10 border-red-500/20";
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold mono ${color}`}>
      {score}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-slate-500 mono uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mono ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecentAnalyses()]);

  const {
    totalAnalyzed,
    totalReports,
    avgScore,
    flagBreakdown,
    platformBreakdown,
    tierBreakdown,
    totalFlags,
  } = stats;

  const isEmpty = totalAnalyzed === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Overview of all listings analyzed and community reports.
          </p>
        </div>
        <Link
          href="/analyze"
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          + Analyze a Listing
        </Link>
      </div>

      {/* ── Top stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Analyzed"
          value={totalAnalyzed}
          sub="listings scanned"
          accent="text-white"
        />
        <StatCard
          label="Avg Trust Score"
          value={avgScore}
          sub={isEmpty ? "no data yet" : avgScore >= 70 ? "generally safe" : avgScore >= 50 ? "exercise caution" : "high-risk pool"}
          accent={
            avgScore >= 70 ? "text-green-400" :
            avgScore >= 50 ? "text-yellow-400" : "text-red-400"
          }
        />
        <StatCard
          label="Risk Flags Fired"
          value={totalFlags}
          sub={totalAnalyzed > 0 ? `${(totalFlags / totalAnalyzed).toFixed(1)} avg per listing` : "no data yet"}
          accent="text-orange-400"
        />
        <StatCard
          label="Community Reports"
          value={totalReports}
          sub="scam reports submitted"
          accent="text-red-400"
        />
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {isEmpty ? (
        <div className="card py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-500/10 border border-slate-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={1.5} className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium mb-2">No data yet</p>
          <p className="text-slate-600 text-sm mb-6">
            Analyze your first listing to start seeing insights here.
          </p>
          <Link
            href="/analyze"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Analyze a Listing
          </Link>
        </div>
      ) : (
        <>
          {/* ── Charts grid ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <DashboardCharts
              avgScore={avgScore}
              flagBreakdown={flagBreakdown}
              platformBreakdown={platformBreakdown}
              tierBreakdown={tierBreakdown}
              totalAnalyzed={totalAnalyzed}
            />
          </div>

          {/* ── Recent analyses ────────────────────────────────────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-semibold text-slate-400 mono uppercase tracking-wider">
                Recent Analyses
              </h3>
              <span className="text-xs text-slate-600 mono">last {recent.length}</span>
            </div>

            {recent.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">No analyses yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[#1e2a3f]">
                      <th className="pb-3 pr-4 text-xs text-slate-500 mono font-medium uppercase tracking-wider">Listing</th>
                      <th className="pb-3 pr-4 text-xs text-slate-500 mono font-medium uppercase tracking-wider">Platform</th>
                      <th className="pb-3 pr-4 text-xs text-slate-500 mono font-medium uppercase tracking-wider">Price</th>
                      <th className="pb-3 pr-4 text-xs text-slate-500 mono font-medium uppercase tracking-wider">Score</th>
                      <th className="pb-3 pr-4 text-xs text-slate-500 mono font-medium uppercase tracking-wider">Tier</th>
                      <th className="pb-3 text-xs text-slate-500 mono font-medium uppercase tracking-wider">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a3f]">
                    {recent.map((row) => {
                      const tier = TIER_CONFIG[row.trustTier as TrustTier] ?? TIER_CONFIG.caution;
                      const platColor = PLATFORM_COLORS[row.platform] ?? "text-slate-400";
                      return (
                        <tr key={row.id} className="group hover:bg-[#0d1117]/40 transition-colors">
                          <td className="py-3 pr-4">
                            <Link
                              href={`/results/${row.id}`}
                              className="text-slate-300 hover:text-white transition-colors line-clamp-1 max-w-[220px] block"
                            >
                              {row.title}
                            </Link>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs mono uppercase font-semibold ${platColor}`}>
                              {row.platform}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-slate-300 mono text-xs">
                              ${row.price.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <ScoreChip score={row.trustScore} />
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold mono ${tier.color} ${tier.bg} ${tier.border}`}>
                              {tier.label}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-slate-600 mono">
                              {timeAgo(new Date(row.createdAt))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Bottom CTA strip ────────────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">Community Reports</p>
            <p className="text-xs text-slate-500">Browse scam listings flagged by users.</p>
          </div>
          <Link
            href="/reports"
            className="shrink-0 rounded-lg border border-[#1e2a3f] px-4 py-2 text-xs font-semibold text-slate-300 hover:border-[#2e3d5a] hover:text-white transition-colors"
          >
            View Reports →
          </Link>
        </div>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">Spotted a Scam?</p>
            <p className="text-xs text-slate-500">Help the community by reporting it.</p>
          </div>
          <Link
            href="/report"
            className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Report It →
          </Link>
        </div>
      </div>
    </div>
  );
}
