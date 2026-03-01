import { AnalyzeForm } from "@/components/AnalyzeForm";
import type { Platform, Category } from "@/types";
import Link from "next/link";

export const metadata = {
  title: "Analyze a Listing — ListingShield",
};

interface ExtensionData {
  url?:               string;
  platform?:          string;
  title?:             string;
  description?:       string;
  price?:             number;
  category?:          string;
  imageUrls?:         string[];
  sellerUsername?:    string;
  sellerAccountAge?:  number;
  sellerReviewCount?: number;
  sellerAvgRating?:   number;
  sellerIsVerified?:  boolean;
}

function decodeExtensionData(raw: string): ExtensionData | null {
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    return JSON.parse(json) as ExtensionData;
  } catch {
    return null;
  }
}

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; platform?: string; d?: string }>;
}) {
  const params = await searchParams;

  // ?d= is a base64-encoded JSON blob sent by the browser extension
  const extData = params.d ? decodeExtensionData(params.d) : null;

  const initialUrl      = extData?.url      ?? params.url ?? "";
  const initialPlatform = (extData?.platform ?? params.platform ?? undefined) as Platform | undefined;

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
          {extData
            ? "Data imported from Facebook Marketplace — review the fields and click Run Analysis."
            : "Fill in as many details as you have. More info = more accurate results."}
        </p>
      </div>

      {extData && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Imported from ListingShield extension — Facebook Marketplace
        </div>
      )}

      <AnalyzeForm
        initialUrl={initialUrl}
        initialPlatform={initialPlatform}
        initialData={extData ? {
          title:             extData.title,
          description:       extData.description,
          price:             extData.price,
          category:          extData.category as Category | undefined,
          imageUrls:         extData.imageUrls,
          sellerUsername:    extData.sellerUsername,
          sellerAccountAge:  extData.sellerAccountAge,
          sellerReviewCount: extData.sellerReviewCount,
          sellerAvgRating:   extData.sellerAvgRating,
          sellerIsVerified:  extData.sellerIsVerified,
        } : undefined}
      />
    </div>
  );
}
