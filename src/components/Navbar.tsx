"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  // "/" and "/analyze" both count as the "Analyze" section
  const isAnalyze   = pathname === "/" || pathname === "/analyze";
  const isReports   = pathname.startsWith("/reports") || pathname === "/report";
  const isDashboard = pathname === "/dashboard";
  const isResults   = pathname.startsWith("/results");

  function navCls(active: boolean) {
    return active
      ? "text-white"
      : "text-slate-400 hover:text-white transition-colors";
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1e2a3f] bg-[#06080d]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 group-hover:bg-blue-600/30 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-400" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Listing<span className="text-blue-400">Shield</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6 text-sm">
          <Link href="/" className={navCls(isAnalyze && !isResults)}>
            Analyze
          </Link>
          <Link href="/reports" className={navCls(isReports)}>
            Reports
          </Link>
          <Link href="/dashboard" className={navCls(isDashboard)}>
            Dashboard
          </Link>
          <Link
            href="/analyze"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            + Manual Entry
          </Link>
        </div>
      </div>
    </nav>
  );
}
