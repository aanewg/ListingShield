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
  location?:          string;
  _sellerId?:         string;
  _itemsForSale?:     number;
}

/**
 * Validates and clamps every field decoded from the ?d= extension parameter.
 * Prevents type-confusion, oversized strings, and javascript: URL injection.
 */
function sanitizeExtensionData(raw: ExtensionData): ExtensionData {
  // Only allow http/https URLs — strips javascript:, data:, file:, etc.
  let url: string | undefined;
  if (typeof raw.url === "string") {
    try {
      const u = new URL(raw.url.slice(0, 2048));
      if (u.protocol === "https:" || u.protocol === "http:") url = u.href;
    } catch { /* invalid URL — discard */ }
  }

  return {
    url,
    platform:          typeof raw.platform        === "string"  ? raw.platform.slice(0, 50)        : undefined,
    title:             typeof raw.title            === "string"  ? raw.title.slice(0, 500)           : undefined,
    description:       typeof raw.description      === "string"  ? raw.description.slice(0, 10_000)  : undefined,
    price:             typeof raw.price === "number" && isFinite(raw.price) && raw.price >= 0 && raw.price <= 1_000_000
                         ? raw.price : undefined,
    category:          typeof raw.category         === "string"  ? raw.category.slice(0, 100)        : undefined,
    imageUrls:         Array.isArray(raw.imageUrls)
                         ? raw.imageUrls
                             .filter((u): u is string => typeof u === "string")
                             .slice(0, 20)
                             .map((u) => u.slice(0, 2048))
                         : undefined,
    sellerUsername:    typeof raw.sellerUsername   === "string"  ? raw.sellerUsername.slice(0, 200)  : undefined,
    sellerAccountAge:  typeof raw.sellerAccountAge === "number"  && isFinite(raw.sellerAccountAge)
                         && raw.sellerAccountAge >= 0 && raw.sellerAccountAge <= 36_500
                         ? raw.sellerAccountAge : undefined,
    sellerReviewCount: typeof raw.sellerReviewCount === "number" && isFinite(raw.sellerReviewCount)
                         && raw.sellerReviewCount >= 0
                         ? Math.round(raw.sellerReviewCount) : undefined,
    sellerAvgRating:   typeof raw.sellerAvgRating  === "number"  && isFinite(raw.sellerAvgRating)
                         && raw.sellerAvgRating >= 0 && raw.sellerAvgRating <= 5
                         ? raw.sellerAvgRating : undefined,
    sellerIsVerified:  typeof raw.sellerIsVerified === "boolean" ? raw.sellerIsVerified             : undefined,
    location:          typeof raw.location         === "string"  ? raw.location.slice(0, 200)       : undefined,
    _sellerId:         typeof raw._sellerId        === "string"  ? raw._sellerId.slice(0, 200)      : undefined,
    _itemsForSale:     typeof raw._itemsForSale    === "number"  && isFinite(raw._itemsForSale)
                         && raw._itemsForSale >= 0
                         ? Math.round(raw._itemsForSale) : undefined,
  };
}

function decodeExtensionData(raw: string): ExtensionData | null {
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(json) as ExtensionData;
    return sanitizeExtensionData(parsed);
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

      {!extData && initialPlatform === "facebook" && (
        <div className="mb-6 rounded-lg border border-blue-500/20 bg-[#0d1117] p-4 text-sm">
          <p className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            How to analyze a Facebook Marketplace listing
          </p>
          <ol className="space-y-2 text-slate-400 list-none">
            {[
              "Install the ListingShield Chrome extension",
              "Open the Facebook Marketplace listing in your browser",
              "Make sure you are logged in to Facebook",
              "Click the ListingShield extension icon in your toolbar",
              "Click \"Extract & Analyze Listing\" — data imports here automatically",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 h-5 w-5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center justify-center mono">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-600">
            No extension? Upload a screenshot below and Claude will extract the listing data from the image.
          </p>
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
          sellerProfileUrl:  extData._sellerId
                               ? `https://www.facebook.com/marketplace/profile/${extData._sellerId}`
                               : undefined,
          sellerLocation:    extData.location,
          sellerItemsSold:   extData._itemsForSale,
        } : undefined}
      />
    </div>
  );
}
