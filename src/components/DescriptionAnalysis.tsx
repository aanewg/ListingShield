interface Props {
  title:       string;
  description: string;
  wordCount:   number;
  qualityScore: number;
}

function QualityMeter({ score }: { score: number }) {
  const color =
    score >= 80 ? "#22c55e" :
    score >= 60 ? "#14b8a6" :
    score >= 40 ? "#eab308" :
                  "#ef4444";

  const label =
    score >= 80 ? "Good" :
    score >= 60 ? "Fair" :
    score >= 40 ? "Poor" :
                  "Very Poor";

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mono mb-1.5">
        <span>QUALITY SCORE</span>
        <span style={{ color }} className="font-semibold">{score} — {label}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#1e2a3f] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-[#1e2a3f] bg-[#111827] p-3">
      <p className="text-[10px] text-slate-500 mono uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold mono ${warn ? "text-yellow-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

export function DescriptionAnalysis({ title, description, wordCount, qualityScore }: Props) {
  const sentenceCount = description.split(/[.!?]+/).filter((s) => s.trim()).length;
  const avgWordLen = description.split(/\s+/).reduce((s, w) => s + w.length, 0) / Math.max(wordCount, 1);
  const hasCapitals = /[A-Z]{4,}/.test(description);
  const hasExclamations = (description.match(/!/g) ?? []).length > 2;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-5">
        Description Analysis
      </h3>

      {/* Quality meter */}
      <QualityMeter score={qualityScore} />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <Stat label="Words" value={String(wordCount)} warn={wordCount < 20} />
        <Stat label="Sentences" value={String(sentenceCount)} />
        <Stat label="Avg word len" value={`${avgWordLen.toFixed(1)} ch`} />
        <Stat label="CAPS words" value={hasCapitals ? "Yes" : "No"} warn={hasCapitals} />
      </div>

      {/* Description preview */}
      <div className="mt-5">
        <p className="text-[10px] text-slate-500 mono uppercase tracking-wider mb-2">LISTING TITLE</p>
        <p className="text-sm text-white font-medium leading-relaxed bg-[#111827] border border-[#1e2a3f] rounded-lg px-3 py-2">
          {title}
        </p>
      </div>

      {description && (
        <div className="mt-3">
          <p className="text-[10px] text-slate-500 mono uppercase tracking-wider mb-2">DESCRIPTION PREVIEW</p>
          <p className="text-sm text-slate-300 leading-relaxed bg-[#111827] border border-[#1e2a3f] rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
            {description.length > 400 ? description.slice(0, 400) + "…" : description}
          </p>
        </div>
      )}

      {/* Warning badges */}
      {(hasCapitals || hasExclamations) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hasCapitals && (
            <span className="text-xs rounded px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 mono">
              Excessive caps detected
            </span>
          )}
          {hasExclamations && (
            <span className="text-xs rounded px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 mono">
              Excessive exclamation marks
            </span>
          )}
        </div>
      )}
    </div>
  );
}
