interface Props {
  listingPrice: number;
  marketAvgPrice: number | null;
  deviationPercent: number | null;
}

export function PriceAnalysis({ listingPrice, marketAvgPrice, deviationPercent }: Props) {
  if (marketAvgPrice === null || deviationPercent === null) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Price Analysis
        </h3>
        <p className="text-slate-500 text-sm">
          No market price data available for this item. Try providing a more specific title or category.
        </p>
        <div className="mt-4 p-3 rounded-lg bg-[#111827] border border-[#1e2a3f]">
          <span className="text-xs text-slate-500 mono">LISTING PRICE</span>
          <p className="text-2xl font-bold text-white mono mt-1">${listingPrice.toFixed(2)}</p>
        </div>
      </div>
    );
  }

  const isBelow = deviationPercent < 0;
  const absPct = Math.abs(deviationPercent);
  const ratio = listingPrice / marketAvgPrice; // 0–2+ scale

  // Bar widths (cap at container width)
  const maxVal = Math.max(listingPrice, marketAvgPrice) * 1.15;
  const listingW = Math.round((listingPrice / maxVal) * 100);
  const marketW = Math.round((marketAvgPrice / maxVal) * 100);

  const deviationColor =
    absPct > 50 ? "#ef4444" :
    absPct > 40 ? "#f97316" :
    absPct > 25 ? "#eab308" :
    isBelow     ? "#3b82f6" :
                  "#22c55e";

  const verdict =
    absPct > 50 ? "Way below market — major red flag" :
    absPct > 40 ? "Well below market — high risk" :
    absPct > 25 ? "Below market — warrants caution" :
    absPct < 10 ? "Consistent with market pricing" :
                  "Slightly above market — probably fine";

  return (
    <div className="card">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-5">
        Price Analysis
      </h3>

      {/* Two bar comparison */}
      <div className="space-y-4">
        {/* Listing price bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mono mb-1.5">
            <span>LISTING PRICE</span>
            <span className="text-white font-semibold">${listingPrice.toFixed(2)}</span>
          </div>
          <div className="h-3 rounded-full bg-[#1e2a3f] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${listingW}%`, backgroundColor: deviationColor }}
            />
          </div>
        </div>

        {/* Market avg bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mono mb-1.5">
            <span>MARKET AVERAGE</span>
            <span className="text-white font-semibold">${marketAvgPrice.toFixed(2)}</span>
          </div>
          <div className="h-3 rounded-full bg-[#1e2a3f] overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-500 transition-all duration-700"
              style={{ width: `${marketW}%` }}
            />
          </div>
        </div>
      </div>

      {/* Deviation badge */}
      <div className="mt-5 flex items-center justify-between rounded-lg bg-[#111827] border border-[#1e2a3f] px-4 py-3">
        <div>
          <p className="text-xs text-slate-500 mono mb-0.5">DEVIATION</p>
          <p className="text-xl font-bold mono" style={{ color: deviationColor }}>
            {isBelow ? "-" : "+"}{absPct.toFixed(1)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mono mb-0.5">RATIO</p>
          <p className="text-xl font-bold mono" style={{ color: deviationColor }}>
            {ratio.toFixed(2)}x
          </p>
        </div>
      </div>

      {/* Verdict line */}
      <p className="mt-3 text-sm text-slate-400 flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: deviationColor }}
        />
        {verdict}
      </p>
    </div>
  );
}
