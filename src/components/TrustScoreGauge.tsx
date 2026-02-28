"use client";

import { useEffect, useState } from "react";
import type { TrustTier } from "@/types";

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIER_CONFIG: Record<
  TrustTier,
  { color: string; label: string; glowClass: string }
> = {
  highly_trusted: { color: "#22c55e", label: "Highly Trusted",   glowClass: "glow-safe" },
  looks_good:     { color: "#14b8a6", label: "Looks Good",       glowClass: "glow-teal" },
  caution:        { color: "#eab308", label: "Proceed with Caution", glowClass: "glow-caution" },
  risky:          { color: "#f97316", label: "Risky",            glowClass: "glow-risky" },
  likely_scam:    { color: "#ef4444", label: "Likely Scam",      glowClass: "glow-scam" },
};

interface Props {
  score: number;
  tier: TrustTier;
}

export function TrustScoreGauge({ score, tier }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = TIER_CONFIG[tier];

  useEffect(() => {
    // Tiny delay so the transition actually fires after mount
    const t = setTimeout(() => setAnimatedScore(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  const offset = CIRCUMFERENCE * (1 - animatedScore / 100);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`relative rounded-full p-2 ${config.glowClass}`}>
        <svg
          viewBox="0 0 200 200"
          width="260"
          height="260"
          aria-label={`Trust score: ${score} out of 100`}
        >
          {/* Tick marks */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const inner = 92;
            const outer = 98;
            const x1 = 100 + inner * Math.cos(rad);
            const y1 = 100 + inner * Math.sin(rad);
            const x2 = 100 + outer * Math.cos(rad);
            const y2 = 100 + outer * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#1e2a3f"
                strokeWidth={1}
              />
            );
          })}

          {/* Background track */}
          <circle
            r={RADIUS}
            cx={100}
            cy={100}
            fill="none"
            stroke="#1e2a3f"
            strokeWidth={14}
          />

          {/* Progress arc */}
          <circle
            r={RADIUS}
            cx={100}
            cy={100}
            fill="none"
            stroke={config.color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90, 100, 100)"
            className="gauge-arc"
          />

          {/* Center score */}
          <text
            x={100}
            y={90}
            textAnchor="middle"
            fill="white"
            fontSize={46}
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
          >
            {Math.round(animatedScore)}
          </text>

          {/* "/100" label */}
          <text
            x={100}
            y={114}
            textAnchor="middle"
            fill="#64748b"
            fontSize={12}
            fontFamily="JetBrains Mono, monospace"
          >
            / 100
          </text>

          {/* Tier label */}
          <text
            x={100}
            y={134}
            textAnchor="middle"
            fill={config.color}
            fontSize={11}
            fontWeight="600"
            fontFamily="Outfit, sans-serif"
            letterSpacing="0.08em"
          >
            {config.label.toUpperCase()}
          </text>
        </svg>
      </div>

      {/* Score bar */}
      <div className="w-full max-w-[260px]">
        <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
          <span>0</span>
          <span>TRUST SCORE</span>
          <span>100</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1e2a3f] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${animatedScore}%`, backgroundColor: config.color }}
          />
        </div>
      </div>
    </div>
  );
}
