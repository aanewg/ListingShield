import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#1e2a3f] bg-[#06080d]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600/20 border border-blue-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-blue-400" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white">
              Listing<span className="text-blue-400">Shield</span>
            </span>
            <span className="text-slate-600 text-xs ml-1">— Fraud Detection Engine</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            <Link href="/"          className="hover:text-slate-300 transition-colors">Analyze</Link>
            <Link href="/analyze"   className="hover:text-slate-300 transition-colors">Manual Entry</Link>
            <Link href="/reports"   className="hover:text-slate-300 transition-colors">Community Reports</Link>
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
            <Link href="/report"    className="hover:text-red-400 transition-colors text-red-500/60">Report a Scam</Link>
          </nav>
        </div>

        <div className="mt-6 pt-5 border-t border-[#1e2a3f] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <p>Built to protect marketplace buyers. Not affiliated with any platform.</p>
          <p className="mono">v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
