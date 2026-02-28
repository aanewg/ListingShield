import { ReportForm } from "@/components/ReportForm";
import type { Platform } from "@/types";
import Link from "next/link";

export const metadata = { title: "Report a Listing — ListingShield" };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const initialUrl      = params.listing ?? "";
  const initialPlatform = (params.platform as Platform) ?? undefined;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/reports" className="text-xs text-slate-500 hover:text-slate-300 transition-colors mono mb-4 inline-flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Reports
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Report a Listing</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Help protect the community by reporting suspicious or confirmed scam listings.
          Reports are public and help others avoid the same traps.
        </p>
      </div>

      {/* Warning banner */}
      <div className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 flex gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth={2} className="h-5 w-5 shrink-0 mt-0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-xs text-yellow-400 leading-relaxed">
          Only report listings you genuinely believe are fraudulent or deceptive.
          False reports undermine the community&apos;s trust.
        </p>
      </div>

      <ReportForm
        initialUrl={initialUrl}
        initialPlatform={initialPlatform}
      />
    </div>
  );
}
