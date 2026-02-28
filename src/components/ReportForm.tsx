"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Platform, ReportType } from "@/types";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "mercari",  label: "Mercari"             },
  { id: "ebay",     label: "eBay"                },
  { id: "facebook", label: "Facebook Marketplace"},
  { id: "poshmark", label: "Poshmark"            },
  { id: "depop",    label: "Depop"               },
  { id: "manual",   label: "Other"               },
];

const REPORT_TYPES: { id: ReportType; label: string; desc: string }[] = [
  { id: "scam",         label: "Scam / Fraud",       desc: "Fake listing, seller disappeared, never shipped" },
  { id: "counterfeit",  label: "Counterfeit Item",    desc: "Fake/replica sold as authentic brand name item"  },
  { id: "fake_reviews", label: "Fake Reviews",        desc: "Reviews appear fabricated or incentivized"       },
  { id: "bait_switch",  label: "Bait & Switch",       desc: "Received a different item than what was shown"   },
  { id: "other",        label: "Other",               desc: "Something else suspicious"                       },
];

interface Props {
  initialUrl?:      string;
  initialPlatform?: Platform;
  onSuccess?: () => void;
}

export function ReportForm({ initialUrl = "", initialPlatform, onSuccess }: Props) {
  const router = useRouter();
  const [platform,    setPlatform]    = useState<Platform>(initialPlatform ?? "manual");
  const [listingUrl,  setListingUrl]  = useState(initialUrl);
  const [reportType,  setReportType]  = useState<ReportType>("scam");
  const [details,     setDetails]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listingUrl.trim()) { setError("Listing URL is required."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingUrl: listingUrl.trim(),
          platform,
          reportType,
          details: details.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Submission failed.");
      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="card text-center py-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Report Submitted</h3>
        <p className="text-slate-400 text-sm mb-6">
          Thanks for helping protect the community. Your report has been logged.
        </p>
        <button
          onClick={() => router.push("/reports")}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          View Community Reports
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Platform */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-1.5">
          Platform
        </label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="w-full rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors appearance-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Listing URL */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-1.5">
          Listing URL
        </label>
        <input
          type="url"
          value={listingUrl}
          onChange={(e) => setListingUrl(e.target.value)}
          placeholder="https://www.mercari.com/listing/..."
          required
          className="w-full rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 transition-colors mono"
        />
      </div>

      {/* Report type */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-2">
          Report Type
        </label>
        <div className="space-y-2">
          {REPORT_TYPES.map((rt) => (
            <label
              key={rt.id}
              className={`flex items-start gap-3 rounded-lg border cursor-pointer p-3 transition-colors ${
                reportType === rt.id
                  ? "border-blue-500/40 bg-blue-500/10"
                  : "border-[#1e2a3f] bg-[#111827] hover:border-[#2e3d5a]"
              }`}
            >
              <input
                type="radio"
                name="reportType"
                value={rt.id}
                checked={reportType === rt.id}
                onChange={() => setReportType(rt.id)}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <p className="text-sm font-semibold text-white">{rt.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{rt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Details */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-1.5">
          Additional Details <span className="text-slate-600 font-normal normal-case">(optional)</span>
        </label>
        <textarea
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe what happened or what made this listing suspicious..."
          className="w-full rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-red-500 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}
