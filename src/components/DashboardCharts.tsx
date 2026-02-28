"use client";

import type { TrustTier } from "@/types";

// ─── Shared bar chart ─────────────────────────────────────────────────────────

interface BarItem {
  label: string;
  value: number;
  color: string;
}

function HorizontalBarChart({ items, emptyMsg }: { items: BarItem[]; emptyMsg?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0 || items.every((i) => i.value === 0)) {
    return <p className="text-sm text-slate-600 py-4 text-center">{emptyMsg ?? "No data yet."}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">{item.label}</span>
            <span className="text-white mono font-semibold">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-[#1e2a3f] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const R = 60;
  const CIRC = 2 * Math.PI * R;
  let cumOffset = 0;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-36">
        <p className="text-sm text-slate-600">No data yet.</p>
      </div>
    );
  }

  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct   = s.value / total;
      const dash  = pct * CIRC;
      const gap   = CIRC - dash;
      const offset = -cumOffset;
      cumOffset += dash;
      return { ...s, dash, gap, offset };
    });

  return (
    <div className="flex items-center gap-6">
      {/* SVG donut */}
      <div className="shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {arcs.map((arc, i) => (
            <circle
              key={i}
              r={R}
              cx={70}
              cy={70}
              fill="none"
              stroke={arc.color}
              strokeWidth={18}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={arc.offset}
              transform="rotate(-90, 70, 70)"
            />
          ))}
          {/* Hole */}
          <circle r={42} cx={70} cy={70} fill="#0d1117" />
          <text x={70} y={67} textAnchor="middle" fill="white" fontSize={20} fontWeight="700" fontFamily="JetBrains Mono, monospace">
            {total}
          </text>
          <text x={70} y={82} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="Outfit, sans-serif">
            TOTAL
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: arc.color }} />
              <span className="text-xs text-slate-400">{arc.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white mono font-semibold">{arc.value}</span>
              <span className="text-xs text-slate-600 mono w-10 text-right">
                {Math.round((arc.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gauge mini ───────────────────────────────────────────────────────────────

function MiniGauge({ score }: { score: number }) {
  const R    = 36;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - score / 100);
  const color =
    score >= 90 ? "#22c55e" :
    score >= 70 ? "#14b8a6" :
    score >= 50 ? "#eab308" :
    score >= 30 ? "#f97316" : "#ef4444";

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle r={R} cx={45} cy={45} fill="none" stroke="#1e2a3f" strokeWidth={8} />
      <circle
        r={R} cx={45} cy={45}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        transform="rotate(-90, 45, 45)"
        style={{ transition: "stroke-dashoffset 1s ease-out" }}
      />
      <text x={45} y={49} textAnchor="middle" fill="white" fontSize={18} fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {score}
      </text>
    </svg>
  );
}

// ─── Exported chart sections ─────────────────────────────────────────────────

const FLAG_LABELS: Record<string, string> = {
  PRICE_WAY_BELOW_MARKET:    "Price Way Below Market",
  PRICE_BELOW_MARKET:        "Price Below Market",
  VERY_NEW_SELLER_ACCOUNT:   "Very New Account",
  NEW_SELLER_ACCOUNT:        "New Seller Account",
  LOW_REVIEW_COUNT:          "Low Review Count",
  OFF_PLATFORM_LANGUAGE:     "Off-Platform Language",
  VAGUE_DESCRIPTION:         "Vague Description",
  SHORT_DESCRIPTION:         "Short Description",
  KEYWORD_STUFFING:          "Keyword Stuffing",
  NO_AUTHENTICITY_PROOF:     "No Auth Proof",
  REVIEW_BURST_PATTERN:      "Review Burst Pattern",
  HIGH_LISTING_VELOCITY:     "High Listing Velocity",
  STOCK_PHOTO_SUSPECTED:     "Stock Photo Suspected",
  DESCRIPTION_IMAGE_MISMATCH:"Desc/Image Mismatch",
  CATEGORY_MISMATCH:         "Category Mismatch",
};

const FLAG_COLORS: Record<string, string> = {
  PRICE_WAY_BELOW_MARKET:  "#ef4444",
  PRICE_BELOW_MARKET:      "#f97316",
  VERY_NEW_SELLER_ACCOUNT: "#ef4444",
  NEW_SELLER_ACCOUNT:      "#f97316",
  LOW_REVIEW_COUNT:        "#eab308",
  OFF_PLATFORM_LANGUAGE:   "#ef4444",
  VAGUE_DESCRIPTION:       "#eab308",
  SHORT_DESCRIPTION:       "#3b82f6",
  KEYWORD_STUFFING:        "#eab308",
  NO_AUTHENTICITY_PROOF:   "#3b82f6",
  REVIEW_BURST_PATTERN:    "#f97316",
  HIGH_LISTING_VELOCITY:   "#eab308",
  STOCK_PHOTO_SUSPECTED:   "#f97316",
  DESCRIPTION_IMAGE_MISMATCH:"#eab308",
  CATEGORY_MISMATCH:       "#3b82f6",
};

const TIER_CONFIG: Record<TrustTier, { label: string; color: string }> = {
  highly_trusted: { label: "Highly Trusted", color: "#22c55e" },
  looks_good:     { label: "Looks Good",     color: "#14b8a6" },
  caution:        { label: "Caution",        color: "#eab308" },
  risky:          { label: "Risky",          color: "#f97316" },
  likely_scam:    { label: "Likely Scam",    color: "#ef4444" },
};

const PLATFORM_COLORS: Record<string, string> = {
  ebay:     "#eab308",
  mercari:  "#ef4444",
  facebook: "#3b82f6",
  poshmark: "#ec4899",
  depop:    "#a855f7",
  manual:   "#64748b",
};

interface DashboardChartsProps {
  avgScore:          number;
  flagBreakdown:     Record<string, number>;
  platformBreakdown: Record<string, number>;
  tierBreakdown:     Record<string, number>;
  totalAnalyzed:     number;
}

export function DashboardCharts({
  avgScore,
  flagBreakdown,
  platformBreakdown,
  tierBreakdown,
  totalAnalyzed,
}: DashboardChartsProps) {
  // Top 8 flags sorted by count
  const flagItems: BarItem[] = Object.entries(flagBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, val]) => ({
      label: FLAG_LABELS[key] ?? key,
      value: val,
      color: FLAG_COLORS[key] ?? "#3b82f6",
    }));

  // Platform breakdown
  const platformItems: BarItem[] = Object.entries(platformBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: val,
      color: PLATFORM_COLORS[key] ?? "#64748b",
    }));

  // Tier donut slices (ordered worst → best for visual impact)
  const tierOrder: TrustTier[] = ["likely_scam", "risky", "caution", "looks_good", "highly_trusted"];
  const tierSlices: DonutSlice[] = tierOrder
    .filter((t) => (tierBreakdown[t] ?? 0) > 0)
    .map((t) => ({
      label: TIER_CONFIG[t].label,
      value: tierBreakdown[t] ?? 0,
      color: TIER_CONFIG[t].color,
    }));

  return (
    <>
      {/* Avg score mini-gauge */}
      <div className="card flex items-center gap-5">
        <MiniGauge score={avgScore} />
        <div>
          <p className="text-xs text-slate-500 mono uppercase tracking-wider mb-1">Avg Trust Score</p>
          <p className="text-3xl font-bold text-white mono">{avgScore}</p>
          <p className="text-xs text-slate-500 mt-1">across {totalAnalyzed} listing{totalAnalyzed !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Trust tier donut */}
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-4">
          Trust Tier Distribution
        </h3>
        <DonutChart slices={tierSlices} total={totalAnalyzed} />
      </div>

      {/* Platform breakdown */}
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-4">
          Listings by Platform
        </h3>
        <HorizontalBarChart
          items={platformItems}
          emptyMsg="No listings analyzed yet."
        />
      </div>

      {/* Most common flags — spans full width */}
      <div className="card lg:col-span-3">
        <h3 className="text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-4">
          Most Common Risk Flags
        </h3>
        {flagItems.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-4">No flags recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {flagItems.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-white mono font-semibold">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[#1e2a3f] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((item.value / Math.max(...flagItems.map((i) => i.value), 1)) * 100, 4)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
