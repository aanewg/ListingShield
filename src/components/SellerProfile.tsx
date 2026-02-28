interface Props {
  username:    string | null;
  accountAge:  number | null; // days
  reviewCount: number | null;
  avgRating:   number | null;
  isVerified:  boolean;
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill={filled ? "#eab308" : "none"}
      stroke={filled ? "#eab308" : "#475569"}
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

function statRisk(accountAge: number | null, reviewCount: number | null): "safe" | "warn" | "danger" {
  if (accountAge !== null && accountAge < 7) return "danger";
  if (accountAge !== null && accountAge < 30) return "warn";
  if (reviewCount !== null && reviewCount < 5) return "warn";
  return "safe";
}

const RISK_COLORS = {
  safe:   { text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  warn:   { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  danger: { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
};

function formatAge(days: number): string {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}

export function SellerProfile({ username, accountAge, reviewCount, avgRating, isVerified }: Props) {
  const risk = statRisk(accountAge, reviewCount);
  const colors = RISK_COLORS[risk];

  return (
    <div className="card">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-5">
        Seller Profile
      </h3>

      {/* Username row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-full bg-[#1a2235] border border-[#1e2a3f] flex items-center justify-center text-slate-400 text-sm font-bold mono">
          {username ? username.slice(0, 2).toUpperCase() : "??"}
        </div>
        <div>
          <p className="font-semibold text-white">
            {username || "Unknown seller"}
          </p>
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-green-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.497-1.307 4.492 4.492 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Account age */}
        <div className={`rounded-lg border p-3 text-center ${accountAge !== null && accountAge < 30 ? `${colors.bg} ${colors.border}` : "bg-[#111827] border-[#1e2a3f]"}`}>
          <p className="text-[10px] text-slate-500 mono uppercase tracking-wider mb-1">Age</p>
          <p className={`text-lg font-bold mono ${accountAge !== null && accountAge < 30 ? colors.text : "text-white"}`}>
            {accountAge !== null ? formatAge(accountAge) : "—"}
          </p>
        </div>

        {/* Review count */}
        <div className={`rounded-lg border p-3 text-center ${reviewCount !== null && reviewCount < 5 ? `${colors.bg} ${colors.border}` : "bg-[#111827] border-[#1e2a3f]"}`}>
          <p className="text-[10px] text-slate-500 mono uppercase tracking-wider mb-1">Reviews</p>
          <p className={`text-lg font-bold mono ${reviewCount !== null && reviewCount < 5 ? colors.text : "text-white"}`}>
            {reviewCount !== null ? reviewCount : "—"}
          </p>
        </div>

        {/* Rating */}
        <div className="rounded-lg border border-[#1e2a3f] bg-[#111827] p-3 text-center">
          <p className="text-[10px] text-slate-500 mono uppercase tracking-wider mb-1">Rating</p>
          <p className="text-lg font-bold mono text-white">
            {avgRating !== null ? avgRating.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      {/* Star rating visual */}
      {avgRating !== null && (
        <div className="mt-3 flex items-center justify-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} filled={n <= Math.round(avgRating)} />
          ))}
          <span className="ml-1.5 text-xs text-slate-500 mono">{avgRating.toFixed(1)} / 5.0</span>
        </div>
      )}

      {/* Risk assessment */}
      <div className={`mt-4 rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
        <p className={`text-xs font-semibold ${colors.text} flex items-center gap-1.5`}>
          <span className={`h-1.5 w-1.5 rounded-full inline-block`} style={{ backgroundColor: risk === "danger" ? "#ef4444" : risk === "warn" ? "#eab308" : "#22c55e" }} />
          {risk === "danger" ? "High-risk seller profile" :
           risk === "warn"   ? "Moderate risk — limited history" :
                               "Seller profile looks reasonable"}
        </p>
      </div>
    </div>
  );
}
