"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { id: 1, label: "Initializing scan engine",     ms: 300  },
  { id: 2, label: "Checking price data",           ms: 800  },
  { id: 3, label: "Analyzing seller profile",      ms: 1400 },
  { id: 4, label: "Scanning description for flags",ms: 1900 },
  { id: 5, label: "Calculating trust score",       ms: 2400 },
];

export function AnalysisLoader() {
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [activeId, setActiveId]         = useState<number>(1);
  const [progress, setProgress]         = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      timers.push(
        setTimeout(() => {
          setActiveId(step.id);
          setProgress(Math.round(((i + 1) / STEPS.length) * 100));
          if (i > 0) {
            setCompletedIds((prev) => new Set([...prev, STEPS[i - 1].id]));
          }
        }, step.ms)
      );
    });

    // Mark last step complete slightly after it starts
    timers.push(
      setTimeout(() => {
        setCompletedIds((prev) => new Set([...prev, STEPS[STEPS.length - 1].id]));
        setProgress(100);
      }, 2700)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080d]/95 backdrop-blur-sm">
      {/* Animated radar rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="absolute rounded-full border border-blue-500/10"
            style={{
              width:  `${n * 260}px`,
              height: `${n * 260}px`,
              animation: `ping ${1.5 + n * 0.5}s cubic-bezier(0,0,0.2,1) infinite`,
              animationDelay: `${n * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#60a5fa"
              strokeWidth={1.5}
              className="h-8 w-8 animate-spin"
              style={{ animationDuration: "2s" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Scanning Listing</h2>
          <p className="text-sm text-slate-500 mono mt-1">Running fraud detection algorithms…</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mono mb-2">
            <span>SCAN PROGRESS</span>
            <span className="text-blue-400">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#1e2a3f] overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step) => {
            const done    = completedIds.has(step.id);
            const active  = activeId === step.id && !done;
            const pending = step.id > activeId && !done;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300 ${
                  done    ? "border-green-500/20 bg-green-500/5" :
                  active  ? "border-blue-500/30 bg-blue-500/10" :
                            "border-[#1e2a3f] bg-[#0d1117]/50"
                }`}
              >
                {/* State icon */}
                <div className="shrink-0">
                  {done ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : active ? (
                    <div className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[#1e2a3f]" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-sm mono ${
                    done    ? "text-green-400" :
                    active  ? "text-blue-300" :
                              "text-slate-600"
                  }`}
                >
                  {step.label}
                  {active && (
                    <span className="ml-1 inline-flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="inline-block h-1 w-1 rounded-full bg-blue-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600 mono">
          LISTINGSHIELD v1 · FRAUD DETECTION ENGINE
        </p>
      </div>
    </div>
  );
}
