"use client";

import type { AIAnalysisResult } from "@/lib/ai-analysis";

const SEVERITY_STYLES = {
  critical: { bar: "bg-red-500",    text: "text-red-400",    badge: "bg-red-500/10 border-red-500/20 text-red-400"    },
  high:     { bar: "bg-orange-500", text: "text-orange-400", badge: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
  medium:   { bar: "bg-yellow-500", text: "text-yellow-400", badge: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" },
  low:      { bar: "bg-blue-500",   text: "text-blue-400",   badge: "bg-blue-500/10 border-blue-500/20 text-blue-400"   },
};

const SCAM_TYPE_LABELS: Record<string, string> = {
  counterfeit:          "Counterfeit Item",
  fake_listing:         "Fake Listing",
  price_manipulation:   "Price Manipulation",
  account_farming:      "Account Farming",
  bait_switch:          "Bait & Switch",
  off_platform_payment: "Off-Platform Payment Scam",
  stolen_goods:         "Possible Stolen Goods",
};

interface Props {
  analysis: AIAnalysisResult;
  ruleScore: number;
}

export function AIAnalysis({ analysis, ruleScore }: Props) {
  const { aiScore, summary, recommendation, scamType, additionalFlags } = analysis;

  const scoreDiff   = aiScore - ruleScore;
  const diffLabel   = scoreDiff > 0 ? `+${scoreDiff}` : String(scoreDiff);
  const diffColor   = scoreDiff > 5 ? "text-green-400" : scoreDiff < -5 ? "text-red-400" : "text-slate-400";

  return (
    <div className="card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2a3f]">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth={2} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            AI Analysis
          </h2>
          <span className="text-[10px] mono text-purple-400 border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 rounded">
            claude-sonnet-4-6
          </span>
        </div>

        {/* AI score vs rule score */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">AI score</span>
          <span className="text-lg font-bold text-white mono">{aiScore}</span>
          <span className={`text-xs mono ${diffColor}`}>{diffLabel} vs rules</span>
        </div>
      </div>

      {/* Scam type badge */}
      {scamType && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="text-xs font-semibold text-red-400">
            {SCAM_TYPE_LABELS[scamType] ?? scamType}
          </span>
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>

      {/* Recommendation */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="h-4 w-4 shrink-0 mt-0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-300 leading-relaxed">{recommendation}</p>
      </div>

      {/* Additional flags from AI */}
      {additionalFlags.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mono uppercase tracking-wider mb-3">
            Additional AI Flags
          </p>
          <div className="space-y-3">
            {additionalFlags.map((flag, i) => {
              const styles = SEVERITY_STYLES[flag.severity];
              return (
                <div key={i} className={`rounded-lg border-l-4 pl-4 pr-3 py-3 bg-[#111827] border-[#1e2a3f] ${styles.bar.replace("bg-", "border-l-")}`}
                  style={{ borderLeftColor: styles.bar === "bg-red-500" ? "#ef4444" : styles.bar === "bg-orange-500" ? "#f97316" : styles.bar === "bg-yellow-500" ? "#eab308" : "#3b82f6" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold mono px-1.5 py-0.5 rounded border ${styles.badge}`}>
                      {flag.severity.toUpperCase()}
                    </span>
                    <span className={`text-xs font-semibold ${styles.text}`}>{flag.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{flag.description}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-[#1e2a3f]">
                      <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${flag.confidence * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-600 mono">{Math.round(flag.confidence * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
