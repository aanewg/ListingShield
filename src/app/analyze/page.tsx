import { AnalyzeForm } from "@/components/AnalyzeForm";
import type { Platform } from "@/types";

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
