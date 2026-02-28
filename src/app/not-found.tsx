import Link from "next/link";

export const metadata = { title: "Not Found — ListingShield" };

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} className="h-10 w-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <p className="text-xs text-blue-400 mono uppercase tracking-widest mb-3">404</p>
      <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
      <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
        This listing analysis doesn&apos;t exist or may have been removed.
        Head back and analyze a new one.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          Analyze a Listing →
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[#1e2a3f] bg-[#0d1117] px-6 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  );
}
