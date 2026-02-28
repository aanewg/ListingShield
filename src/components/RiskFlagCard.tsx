import type { DetectedFlag, Severity } from "@/types";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; badgeClass: string; borderClass: string; bgClass: string; icon: string }
> = {
  critical: {
    label: "CRITICAL",
    badgeClass: "bg-red-500/20 text-red-400 border border-red-500/30",
    borderClass: "severity-critical",
    bgClass: "bg-red-500/5",
    icon: "shield",
  },
  high: {
    label: "HIGH",
    badgeClass: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    borderClass: "severity-high",
    bgClass: "bg-orange-500/5",
    icon: "warning",
  },
  medium: {
    label: "MEDIUM",
    badgeClass: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    borderClass: "severity-medium",
    bgClass: "bg-yellow-500/5",
    icon: "info",
  },
  low: {
    label: "LOW",
    badgeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    borderClass: "severity-low",
    bgClass: "bg-blue-500/5",
    icon: "info",
  },
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function Icon({ type }: { type: string }) {
  if (type === "shield") return <ShieldIcon />;
  if (type === "warning") return <WarningIcon />;
  return <InfoIcon />;
}

interface Props {
  flag: DetectedFlag;
}

export function RiskFlagCard({ flag }: Props) {
  const cfg = SEVERITY_CONFIG[flag.severity];
  const confidencePct = Math.round(flag.confidence * 100);

  return (
    <div
      className={`rounded-lg border-l-4 ${cfg.borderClass} ${cfg.bgClass} border border-[#1e2a3f] border-l-4 p-4 flex gap-4 items-start`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 shrink-0 rounded-md p-1.5 ${
          flag.severity === "critical" ? "text-red-400 bg-red-500/10" :
          flag.severity === "high"     ? "text-orange-400 bg-orange-500/10" :
          flag.severity === "medium"   ? "text-yellow-400 bg-yellow-500/10" :
                                         "text-blue-400 bg-blue-500/10"
        }`}
      >
        <Icon type={cfg.icon} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-white">{flag.title}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider mono ${cfg.badgeClass}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{flag.description}</p>
        {/* Confidence bar */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 mono w-28 shrink-0">Confidence: {confidencePct}%</span>
          <div className="flex-1 h-1 rounded-full bg-[#1e2a3f] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${confidencePct}%`,
                backgroundColor:
                  flag.severity === "critical" ? "#ef4444" :
                  flag.severity === "high"     ? "#f97316" :
                  flag.severity === "medium"   ? "#eab308" :
                                                 "#3b82f6",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
