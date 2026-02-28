"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const PLATFORMS = [
  { id: "",         label: "All Platforms" },
  { id: "mercari",  label: "Mercari"       },
  { id: "ebay",     label: "eBay"          },
  { id: "facebook", label: "Facebook"      },
  { id: "poshmark", label: "Poshmark"      },
  { id: "depop",    label: "Depop"         },
];

const TYPES = [
  { id: "",             label: "All Types"      },
  { id: "scam",         label: "Scam"           },
  { id: "counterfeit",  label: "Counterfeit"    },
  { id: "fake_reviews", label: "Fake Reviews"   },
  { id: "bait_switch",  label: "Bait & Switch"  },
  { id: "other",        label: "Other"          },
];

const PLATFORM_COLORS: Record<string, string> = {
  "":         "border-[#1e2a3f] text-slate-400 data-[active=true]:border-slate-400 data-[active=true]:text-white data-[active=true]:bg-slate-400/10",
  mercari:    "border-[#1e2a3f] text-slate-400 data-[active=true]:border-red-500/50 data-[active=true]:text-red-400 data-[active=true]:bg-red-500/10",
  ebay:       "border-[#1e2a3f] text-slate-400 data-[active=true]:border-yellow-500/50 data-[active=true]:text-yellow-400 data-[active=true]:bg-yellow-500/10",
  facebook:   "border-[#1e2a3f] text-slate-400 data-[active=true]:border-blue-500/50 data-[active=true]:text-blue-400 data-[active=true]:bg-blue-500/10",
  poshmark:   "border-[#1e2a3f] text-slate-400 data-[active=true]:border-pink-500/50 data-[active=true]:text-pink-400 data-[active=true]:bg-pink-500/10",
  depop:      "border-[#1e2a3f] text-slate-400 data-[active=true]:border-purple-500/50 data-[active=true]:text-purple-400 data-[active=true]:bg-purple-500/10",
};

export function ReportFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const platform     = searchParams.get("platform") ?? "";
  const type         = searchParams.get("type") ?? "";

  const setFilter = useCallback(
    (key: "platform" | "type", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value); else params.delete(key);
      router.push(`/reports?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-3">
      {/* Platform row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 mono mr-1 shrink-0">Platform:</span>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            data-active={platform === p.id}
            onClick={() => setFilter("platform", p.id)}
            className={`rounded-full border px-3 py-1 text-xs transition-all cursor-pointer hover:opacity-90 ${PLATFORM_COLORS[p.id] ?? PLATFORM_COLORS[""]}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Type row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 mono mr-1 shrink-0">Type:</span>
        {TYPES.map((t) => (
          <button
            key={t.id}
            data-active={type === t.id}
            onClick={() => setFilter("type", t.id)}
            className="rounded-full border border-[#1e2a3f] px-3 py-1 text-xs text-slate-400 transition-all cursor-pointer data-[active=true]:border-blue-500/50 data-[active=true]:text-blue-400 data-[active=true]:bg-blue-500/10 hover:border-[#2e3d5a]"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
