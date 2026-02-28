import { AnalyzeForm } from "@/components/AnalyzeForm";
import type { Platform } from "@/types";
import Link from "next/link";

export const metadata = {
  title: "Analyze a Listing — ListingShield",
};

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const initialUrl      = params.url ?? "";
  const initialPlatform = (params.platform as Platform) ?? undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mono mb-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Home
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Analyze a Listing</h1>
        <p className="text-slate-400 text-sm">
          Fill in as many details as you have. More info = more accurate results.
        </p>
      </div>

      <AnalyzeForm
        initialUrl={initialUrl}
        initialPlatform={initialPlatform}
      />
    </div>
  );
}
