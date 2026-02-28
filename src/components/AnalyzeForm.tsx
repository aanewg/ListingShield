"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnalysisLoader } from "./AnalysisLoader";
import type { Platform, Category } from "@/types";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "mercari",  label: "Mercari"          },
  { id: "ebay",     label: "eBay"             },
  { id: "facebook", label: "Facebook Marketplace" },
  { id: "poshmark", label: "Poshmark"         },
  { id: "depop",    label: "Depop"            },
  { id: "manual",   label: "Other / Manual"   },
];

const CATEGORIES: Category[] = [
  "Electronics", "Clothing", "Shoes", "Handbags",
  "Beauty", "Home", "Toys", "Collectibles", "Other",
];

interface Props {
  initialUrl?:      string;
  initialPlatform?: Platform;
}

// ─── Form field helper components ─────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-400 mono uppercase tracking-wider mb-1.5">
      {children}
      {optional && <span className="ml-1 text-slate-600 normal-case font-normal">(optional)</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors mono"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors appearance-none cursor-pointer"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-lg border border-[#1e2a3f] bg-[#111827] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors resize-none"
    />
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function AnalyzeForm({ initialUrl = "", initialPlatform }: Props) {
  const router = useRouter();
  const [isLoading,  setIsLoading]  = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showManual, setShowManual] = useState(!initialUrl);

  // If a URL was provided (came from the home page input), auto-submit immediately
  useEffect(() => {
    if (initialUrl) {
      handleUrlAnalyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUrlAnalyze(urlToScrape?: string, platformToUse?: Platform) {
    const targetUrl      = urlToScrape ?? initialUrl;
    const targetPlatform = platformToUse ?? initialPlatform ?? "manual";
    if (!targetUrl) return;

    setIsLoading(true);
    setError(null);
    try {
      const [response] = await Promise.all([
        fetch("/api/analyze", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ listingUrl: targetUrl, platform: targetPlatform }),
        }),
        new Promise((resolve) => setTimeout(resolve, 2800)),
      ]);

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as {
          error?: string;
          message?: string;
          partial?: {
            title?: string; description?: string; imageUrls?: string[];
            sellerUsername?: string; sellerReviewCount?: number;
            sellerAvgRating?: number; sellerIsVerified?: boolean; category?: string;
          };
        };

        // Partial scrape — pre-fill whatever we got, show form for missing fields
        if (data.error === "SCRAPE_PARTIAL" && data.partial) {
          if (data.partial.title?.trim())      setTitle(data.partial.title);
          if (data.partial.description?.trim()) setDescription(data.partial.description);
          if (data.partial.imageUrls?.length)  setImageUrls(data.partial.imageUrls.join(", "));
          if (data.partial.sellerUsername)     setSellerUser(data.partial.sellerUsername);
          if (data.partial.sellerReviewCount != null) setReviewCount(String(data.partial.sellerReviewCount));
          if (data.partial.sellerAvgRating   != null) setAvgRating(String(data.partial.sellerAvgRating));
          if (data.partial.sellerIsVerified)   setIsVerified(true);
          if (data.partial.category)           setCategory(data.partial.category as Category);
          setListingUrl(targetUrl);
          setPlatform(targetPlatform);
        }

        setError(data.message ?? "Could not read this listing automatically. Please fill in the details manually.");
        setShowManual(true);
        setIsLoading(false);
        return;
      }

      const data = await response.json() as { id: string };
      router.push(`/results/${data.id}`);
    } catch {
      setError("Something went wrong. Please fill in the details manually.");
      setShowManual(true);
      setIsLoading(false);
    }
  }

  // Form state
  const [platform,    setPlatform]    = useState<Platform>(initialPlatform ?? "manual");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [price,       setPrice]       = useState("");
  const [category,    setCategory]    = useState<Category | "">("");
  const [listingUrl,  setListingUrl]  = useState(initialUrl);
  const [sellerUser,  setSellerUser]  = useState("");
  const [accountAge,  setAccountAge]  = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [avgRating,   setAvgRating]   = useState("");
  const [isVerified,  setIsVerified]  = useState(false);
  const [imageUrls,   setImageUrls]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim() || !price) {
      setError("Title, description, and price are required.");
      return;
    }

    setIsLoading(true);

    const body = {
      platform,
      title:             title.trim(),
      description:       description.trim(),
      price:             parseFloat(price),
      category:          category || undefined,
      listingUrl:        listingUrl.trim() || undefined,
      sellerUsername:    sellerUser.trim() || undefined,
      sellerAccountAge:  accountAge  ? parseInt(accountAge)   : undefined,
      sellerReviewCount: reviewCount ? parseInt(reviewCount)  : undefined,
      sellerAvgRating:   avgRating   ? parseFloat(avgRating)  : undefined,
      sellerIsVerified:  isVerified,
      imageUrls:         imageUrls ? imageUrls.split(",").map((u) => u.trim()).filter(Boolean) : undefined,
    };

    try {
      // Run the API call in parallel with the minimum animation duration
      const [response] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        new Promise((resolve) => setTimeout(resolve, 2800)), // minimum scan time for UX
      ]);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Analysis failed.");
      }

      const data = await response.json() as { id: string };
      router.push(`/results/${data.id}`);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  if (isLoading) return <AnalysisLoader />;

  // If a URL was given but scraping failed, show the error + manual form
  // If no URL was given, show the manual form directly
  if (!showManual) return null; // shouldn't reach here — handleUrlAnalyze runs on mount

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Listing info ─────────────────────────────────────────────────────── */}
      <div className="card space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 pb-3 border-b border-[#1e2a3f]">
          Listing Details
        </h2>

        {/* Platform */}
        <div>
          <Label>Platform</Label>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>

        {/* URL */}
        <div>
          <Label optional>Listing URL</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={listingUrl}
              onChange={(e) => setListingUrl(e.target.value)}
              placeholder="https://www.ebay.com/itm/..."
            />
            {listingUrl.trim() && (
              <button
                type="button"
                onClick={() => handleUrlAnalyze(listingUrl.trim(), platform)}
                className="shrink-0 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/60 transition-colors mono whitespace-nowrap"
              >
                Fetch Details
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <Label>Item Title</Label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Louis Vuitton Neverfull MM Tote Bag"
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label>Description</Label>
          <Textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste the full listing description here…"
            required
          />
        </div>

        {/* Price + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Asking Price ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="99.00"
              required
            />
          </div>
          <div>
            <Label optional>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as Category | "")}>
              <option value="">— Select category —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Image URLs */}
        <div>
          <Label optional>Image URLs</Label>
          <Input
            type="text"
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            placeholder="https://img1.jpg, https://img2.jpg"
          />
          <p className="mt-1 text-xs text-slate-600">Comma-separated. Used for image analysis in future versions.</p>
        </div>
      </div>

      {/* ── Seller info ───────────────────────────────────────────────────────── */}
      <div className="card space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 pb-3 border-b border-[#1e2a3f]">
          Seller Information
          <span className="ml-2 text-slate-600 normal-case font-normal tracking-normal">— all optional, but improves accuracy</span>
        </h2>

        {/* Username + Age */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label optional>Seller Username</Label>
            <Input
              type="text"
              value={sellerUser}
              onChange={(e) => setSellerUser(e.target.value)}
              placeholder="seller123"
            />
          </div>
          <div>
            <Label optional>Account Age (days)</Label>
            <Input
              type="number"
              min="0"
              value={accountAge}
              onChange={(e) => setAccountAge(e.target.value)}
              placeholder="e.g. 365"
            />
          </div>
        </div>

        {/* Reviews + Rating */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label optional>Review Count</Label>
            <Input
              type="number"
              min="0"
              value={reviewCount}
              onChange={(e) => setReviewCount(e.target.value)}
              placeholder="e.g. 42"
            />
          </div>
          <div>
            <Label optional>Avg Rating (0–5)</Label>
            <Input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={avgRating}
              onChange={(e) => setAvgRating(e.target.value)}
              placeholder="e.g. 4.8"
            />
          </div>
        </div>

        {/* Verified */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="sr-only"
            />
            <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isVerified ? "bg-blue-600 border-blue-600" : "bg-[#111827] border-[#1e2a3f] group-hover:border-blue-500/40"}`}>
              {isVerified && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-slate-300">Seller is ID-verified / confirmed by platform</span>
        </label>
      </div>

      {/* ── Submit ────────────────────────────────────────────────────────────── */}
      <button
        type="submit"
        className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white hover:bg-blue-500 active:bg-blue-700 transition-colors"
      >
        Run Analysis →
      </button>

      <p className="text-center text-xs text-slate-600">
        More data = more accurate results. At minimum, provide title, description, and price.
      </p>
    </form>
  );
}
