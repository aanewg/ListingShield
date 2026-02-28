import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { ReportFilters } from "@/components/ReportFilters";

export const metadata = { title: "Community Reports — ListingShield" };

const REPORT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scam:         { label: "Scam",          color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
  counterfeit:  { label: "Counterfeit",   color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  fake_reviews: { label: "Fake Reviews",  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  bait_switch:  { label: "Bait & Switch", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  other:        { label: "Other",         color: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/20"  },
};

const PLATFORM_COLORS: Record<string, string> = {
  mercari:  "bg-red-500/10 text-red-400 border-red-500/20",
  ebay:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  facebook: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  poshmark: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  depop:    "bg-purple-500/10 text-purple-400 border-purple-500/20",
  manual:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60)   return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function getReports(platform?: string, type?: string) {
  return db.userReport.findMany({
    where: {
      ...(platform ? { platform } : {}),
      ...(type     ? { reportType: type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

async function getReportStats() {
  const [total, byType] = await Promise.all([
    db.userReport.count(),
    db.userReport.groupBy({ by: ["reportType"], _count: { id: true } }),
  ]);
  return { total, byType };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; type?: string }>;
}) {
  const params   = await searchParams;
  const platform = params.platform;
  const type     = params.type;

  const [reports, stats] = await Promise.all([
    getReports(platform, type),
    getReportStats(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Community Reports</h1>
          <p className="text-slate-400 text-sm">
            Scam listings reported by the ListingShield community.
            {stats.total > 0 && (
              <span className="ml-2 text-slate-500 mono">{stats.total} total reports</span>
            )}
          </p>
        </div>
        <Link
          href="/report"
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
        >
          + Report a Listing
        </Link>
      </div>

      {/* ── Type stats row ────────────────────────────────────────────────────── */}
      {stats.total > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {stats.byType.map((row) => {
            const cfg = REPORT_TYPE_CONFIG[row.reportType] ?? REPORT_TYPE_CONFIG.other;
            return (
              <div key={row.reportType} className={`rounded-lg border px-3 py-2 ${cfg.bg} ${cfg.border}`}>
                <span className={`text-xs font-semibold mono ${cfg.color}`}>
                  {cfg.label}: {row._count.id}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <Suspense fallback={<div className="h-10 animate-pulse bg-[#1e2a3f] rounded" />}>
          <ReportFilters />
        </Suspense>
      </div>

      {/* ── Active filter label ───────────────────────────────────────────────── */}
      {(platform || type) && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <span>Showing {reports.length} result{reports.length !== 1 ? "s" : ""}</span>
          {platform && (
            <span className="rounded-full border border-[#1e2a3f] bg-[#0d1117] px-2.5 py-0.5 text-xs mono uppercase">
              {platform}
            </span>
          )}
          {type && (
            <span className="rounded-full border border-[#1e2a3f] bg-[#0d1117] px-2.5 py-0.5 text-xs mono">
              {REPORT_TYPE_CONFIG[type]?.label ?? type}
            </span>
          )}
          <Link href="/reports" className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Clear filters
          </Link>
        </div>
      )}

      {/* ── Reports list ──────────────────────────────────────────────────────── */}
      {reports.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-500/10 border border-slate-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={1.5} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium mb-1">No reports found</p>
          <p className="text-slate-600 text-sm">
            {platform || type ? "Try clearing the filters." : "Be the first to report a suspicious listing."}
          </p>
          {!(platform || type) && (
            <Link
              href="/report"
              className="mt-5 inline-block rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
            >
              Submit a Report
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const typeCfg     = REPORT_TYPE_CONFIG[report.reportType] ?? REPORT_TYPE_CONFIG.other;
            const platformCls = PLATFORM_COLORS[report.platform] ?? PLATFORM_COLORS.manual;
            return (
              <div key={report.id} className="card hover:border-[#2e3d5a] transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Left: badges + URL */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {/* Platform badge */}
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold mono uppercase ${platformCls}`}>
                        {report.platform}
                      </span>
                      {/* Type badge */}
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold mono ${typeCfg.bg} ${typeCfg.border} ${typeCfg.color}`}>
                        {typeCfg.label}
                      </span>
                    </div>

                    {/* URL */}
                    <p className="text-sm text-slate-300 truncate font-mono">
                      {report.listingUrl || "—"}
                    </p>

                    {/* Details */}
                    {report.details && (
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
                        {report.details}
                      </p>
                    )}
                  </div>

                  {/* Right: time */}
                  <span className="shrink-0 text-xs text-slate-600 mono mt-0.5">
                    {timeAgo(new Date(report.createdAt))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom CTA ────────────────────────────────────────────────────────── */}
      {reports.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm mb-3">Know about a scam listing?</p>
          <Link
            href="/report"
            className="inline-block rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            + Report It
          </Link>
        </div>
      )}
    </div>
  );
}
