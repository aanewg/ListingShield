import { ListingInput } from "@/components/ListingInput";
import { db } from "@/lib/db";
import Link from "next/link";

// ─── Stats (fetched fresh on each request in dev) ─────────────────────────────

async function getStats() {
  try {
    const [totalAnalyzed, reports, avgArr] = await Promise.all([
      db.listingAnalysis.count(),
      db.userReport.count(),
      db.listingAnalysis.aggregate({ _avg: { trustScore: true } }),
    ]);
    const avgScore = avgArr._avg.trustScore
      ? Math.round(avgArr._avg.trustScore)
      : null;
    return { totalAnalyzed, reports, avgScore };
  } catch {
    return { totalAnalyzed: 0, reports: 0, avgScore: null };
  }
}

async function getRecentReports() {
  try {
    return db.userReport.findMany({ orderBy: { createdAt: "desc" }, take: 3 });
  } catch {
    return [];
  }
}

// ─── How it works steps ───────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Paste a URL or Enter Details",
    body: "Drop in a listing URL from eBay, Mercari, Poshmark, Facebook, or Depop — or fill in the details manually if you don't have a link.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "The Engine Scans for Red Flags",
    body: "Our fraud detection engine checks 15+ risk signals: price deviation from market, seller age, description quality, off-platform payment language, and more.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Get Your Trust Score + Verdict",
    body: "Receive a 0–100 Trust Score, color-coded verdict, and a detailed breakdown of every flag detected — so you know exactly what to watch out for.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

// ─── Scam patterns (static) ───────────────────────────────────────────────────

const SCAM_PATTERNS = [
  {
    title: "Off-Platform Payment Redirect",
    desc: "Seller asks to pay via Zelle, Venmo, or CashApp outside the marketplace — eliminating all buyer protections.",
    severity: "critical",
    color: "text-red-400",
    bg: "bg-red-500/5 border-red-500/20",
  },
  {
    title: "Price Way Below Market",
    desc: "Authentic AirPods Pro listed at $29. Designer bags at $49. If it's more than 50% below market average, it's almost certainly fake.",
    severity: "critical",
    color: "text-red-400",
    bg: "bg-red-500/5 border-red-500/20",
  },
  {
    title: "Brand-New Seller, High-Value Item",
    desc: "Account created yesterday selling a $900 Louis Vuitton bag with no reviews. Classic setup for a take-the-money-and-run scam.",
    severity: "high",
    color: "text-orange-400",
    bg: "bg-orange-500/5 border-orange-500/20",
  },
  {
    title: "Vague Descriptions + Stock Photos",
    desc: "5-word listings, no condition stated, images pulled from Google — scammers rarely bother describing items they don't actually have.",
    severity: "medium",
    color: "text-yellow-400",
    bg: "bg-yellow-500/5 border-yellow-500/20",
  },
];

const REPORT_TYPE_LABELS: Record<string, string> = {
  scam:         "Scam",
  counterfeit:  "Counterfeit",
  fake_reviews: "Fake Reviews",
  bait_switch:  "Bait & Switch",
  other:        "Other",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [stats, recentReports] = await Promise.all([getStats(), getRecentReports()]);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 text-center">
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[900px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-3xl">
          {/* Pill badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs text-blue-400 mono">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Fraud Detection Engine · v1
          </div>

          <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
            Stop Getting Scammed.
            <br />
            <span className="text-blue-400">Check Any Listing in Seconds.</span>
          </h1>

          <p className="mb-10 text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
            ListingShield analyzes marketplace listings for counterfeits, fake sellers,
            price manipulation, and off-platform scam tactics — before you spend a dollar.
          </p>

          {/* Input component */}
          <ListingInput />
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      {stats.totalAnalyzed > 0 && (
        <section className="border-y border-[#1e2a3f] bg-[#0d1117] py-4">
          <div className="mx-auto max-w-5xl px-6 flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-white mono">{stats.totalAnalyzed.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mono uppercase tracking-wider">Listings Analyzed</p>
            </div>
            {stats.avgScore !== null && (
              <div className="text-center">
                <p className="text-2xl font-bold text-white mono">{stats.avgScore}</p>
                <p className="text-xs text-slate-500 mono uppercase tracking-wider">Avg Trust Score</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-2xl font-bold text-white mono">{stats.reports}</p>
              <p className="text-xs text-slate-500 mono uppercase tracking-wider">Community Reports</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white mono">15+</p>
              <p className="text-xs text-slate-500 mono uppercase tracking-wider">Scam Signals Checked</p>
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-slate-400 max-w-md mx-auto">Three steps between you and a smarter purchase decision.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.num} className="card relative group hover:border-blue-500/30 transition-colors">
                {/* Step number */}
                <div className="text-[60px] font-black text-[#1a2235] leading-none mb-4 mono select-none">
                  {step.num}
                </div>
                {/* Icon */}
                <div className="mb-4 h-10 w-10 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  {step.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Common scam patterns ──────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Common Scam Patterns</h2>
              <p className="text-slate-400 text-sm">Tactics ListingShield is trained to detect.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SCAM_PATTERNS.map((p) => (
              <div key={p.title} className={`rounded-xl border p-5 ${p.bg}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 shrink-0 text-xs font-bold mono rounded px-2 py-0.5 ${
                    p.severity === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    p.severity === "high"     ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                                               "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  }`}>
                    {p.severity.toUpperCase()}
                  </span>
                  <div>
                    <h3 className={`text-sm font-semibold mb-1 ${p.color}`}>{p.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent community reports ──────────────────────────────────────────── */}
      {recentReports.length > 0 && (
        <section className="border-t border-[#1e2a3f] px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recent Community Reports</h2>
              <Link href="/reports" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentReports.map((r) => (
                <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs mono rounded-full border border-[#1e2a3f] bg-[#111827] px-2.5 py-0.5 text-slate-400 uppercase">
                      {r.platform}
                    </span>
                    <span className="text-sm text-slate-300 truncate max-w-[280px]">{r.listingUrl || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 mono">
                      {REPORT_TYPE_LABELS[r.reportType] ?? r.reportType}
                    </span>
                    <span className="text-xs text-slate-600 mono">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom CTA ────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#1e2a3f] px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to check a listing?</h2>
          <p className="text-slate-400 mb-6 text-sm">Takes less than 30 seconds. No sign-up required.</p>
          <Link
            href="/analyze"
            className="inline-block rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Analyze a Listing →
          </Link>
        </div>
      </section>
    </div>
  );
}
