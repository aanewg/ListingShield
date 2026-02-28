"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Platform } from "@/types";

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "mercari",  label: "Mercari",    color: "hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 data-[active=true]:border-red-500/50 data-[active=true]:text-red-400 data-[active=true]:bg-red-500/10" },
  { id: "ebay",     label: "eBay",       color: "hover:border-yellow-500/50 hover:text-yellow-400 hover:bg-yellow-500/5 data-[active=true]:border-yellow-500/50 data-[active=true]:text-yellow-400 data-[active=true]:bg-yellow-500/10" },
  { id: "facebook", label: "Facebook",   color: "hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 data-[active=true]:border-blue-500/50 data-[active=true]:text-blue-400 data-[active=true]:bg-blue-500/10" },
  { id: "poshmark", label: "Poshmark",   color: "hover:border-pink-500/50 hover:text-pink-400 hover:bg-pink-500/5 data-[active=true]:border-pink-500/50 data-[active=true]:text-pink-400 data-[active=true]:bg-pink-500/10" },
  { id: "depop",    label: "Depop",      color: "hover:border-purple-500/50 hover:text-purple-400 hover:bg-purple-500/5 data-[active=true]:border-purple-500/50 data-[active=true]:text-purple-400 data-[active=true]:bg-purple-500/10" },
];

function detectPlatform(url: string): Platform | null {
  const lower = url.toLowerCase();
  if (lower.includes("mercari.com"))   return "mercari";
  if (lower.includes("ebay.com"))      return "ebay";
  if (lower.includes("facebook.com") || lower.includes("marketplace")) return "facebook";
  if (lower.includes("poshmark.com"))  return "poshmark";
  if (lower.includes("depop.com"))     return "depop";
  return null;
}

export function ListingInput() {
  const [url, setUrl]           = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const router = useRouter();

  function handleUrlChange(v: string) {
    setUrl(v);
    const detected = detectPlatform(v);
    if (detected) setPlatform(detected);
  }

  function handleAnalyze() {
    const params = new URLSearchParams();
    if (url)      params.set("url", url);
    if (platform) params.set("platform", platform);
    router.push(`/analyze?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* URL input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={1.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          placeholder="Paste a listing URL — or enter details manually below"
          className="w-full rounded-xl border border-[#1e2a3f] bg-[#0d1117] pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors text-sm mono"
        />
      </div>

      {/* Platform pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs text-slate-500 self-center mr-1">Platform:</span>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            data-active={platform === p.id}
            onClick={() => setPlatform(platform === p.id ? null : p.id)}
            className={`rounded-full border border-[#1e2a3f] bg-[#0d1117] px-4 py-1.5 text-sm text-slate-400 transition-all cursor-pointer ${p.color}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleAnalyze}
          className="flex-1 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white hover:bg-blue-500 active:bg-blue-700 transition-colors text-sm"
        >
          Analyze Listing →
        </button>
        <button
          onClick={() => router.push(`/analyze${platform ? `?platform=${platform}` : ""}`)}
          className="sm:flex-none rounded-xl border border-[#1e2a3f] bg-[#0d1117] px-5 py-3.5 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >
          Enter Details Manually
        </button>
      </div>
    </div>
  );
}
