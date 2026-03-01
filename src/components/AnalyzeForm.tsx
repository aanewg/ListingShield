"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnalysisLoader } from "./AnalysisLoader";
import type { Platform, Category } from "@/types";
import type { ScrapedListing } from "@/lib/scraper";

function detectPlatform(url: string): Platform {
  if (url.includes("ebay.com"))     return "ebay";
  if (url.includes("mercari.com"))  return "mercari";
  if (url.includes("facebook.com")) return "facebook";
  if (url.includes("poshmark.com")) return "poshmark";
  if (url.includes("depop.com"))    return "depop";
  return "manual";
}

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

interface InitialData {
  title?:             string;
  description?:       string;
  price?:             number;
  category?:          Category;
  imageUrls?:         string[];
  sellerUsername?:    string;
  sellerAccountAge?:  number;
  sellerReviewCount?: number;
  sellerAvgRating?:   number;
  sellerIsVerified?:  boolean;
}

interface Props {
  initialUrl?:      string;
  initialPlatform?: Platform;
  initialData?:     InitialData;
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

export function AnalyzeForm({ initialUrl = "", initialPlatform, initialData }: Props) {
  const router = useRouter();

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [showManual,      setShowManual]      = useState(!initialUrl || !!initialData);
  const [screenshotState, setScreenshotState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [fetchState,      setFetchState]      = useState<"idle" | "loading" | "done" | "error">(initialData ? "done" : "idle");

  // ── Form state — seeded from initialData when provided (extension import) ─
  const [platform,    setPlatform]    = useState<Platform>(initialPlatform ?? "manual");
  const [title,       setTitle]       = useState(initialData?.title       ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [price,       setPrice]       = useState(initialData?.price != null ? String(initialData.price) : "");
  const [category,    setCategory]    = useState<Category | "">(initialData?.category ?? "");
  const [listingUrl,  setListingUrl]  = useState(initialUrl);
  const [sellerUser,  setSellerUser]  = useState(initialData?.sellerUsername    ?? "");
  const [accountAge,  setAccountAge]  = useState(initialData?.sellerAccountAge  != null ? String(initialData.sellerAccountAge)  : "");
  const [reviewCount, setReviewCount] = useState(initialData?.sellerReviewCount != null ? String(initialData.sellerReviewCount) : "");
  const [avgRating,   setAvgRating]   = useState(initialData?.sellerAvgRating   != null ? String(initialData.sellerAvgRating)   : "");
  const [isVerified,  setIsVerified]  = useState(initialData?.sellerIsVerified  ?? false);
  const [imageUrls,   setImageUrls]   = useState(initialData?.imageUrls?.join(", ") ?? "");

  // ── Effects ───────────────────────────────────────────────────────────────
  // If a URL was provided (came from the home page input), auto-submit immediately
  useEffect(() => {
    if (initialUrl) {
      handleUrlAnalyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  async function handleScreenshot(file: File) {
    setScreenshotState("loading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/extract-from-screenshot", { method: "POST", body: fd });
      const data = await res.json() as {
        error?: string;
        title?: string | null;
        price?: number | null;
        description?: string | null;
        sellerUsername?: string | null;
        sellerReviewCount?: number | null;
        sellerAvgRating?: number | null;
        sellerIsVerified?: boolean | null;
        category?: string | null;
      };

      if (!res.ok || data.error) {
        setError(data.error ?? "Could not read the screenshot. Try a clearer image.");
        setScreenshotState("error");
        return;
      }

      if (data.title?.trim())       setTitle(data.title.trim());
      if (data.price != null)       setPrice(String(data.price));
      if (data.description?.trim()) setDescription(data.description.trim());
      if (data.sellerUsername)      setSellerUser(data.sellerUsername);
      if (data.sellerReviewCount != null) setReviewCount(String(data.sellerReviewCount));
      if (data.sellerAvgRating   != null) setAvgRating(String(data.sellerAvgRating));
      if (data.sellerIsVerified)    setIsVerified(true);
      if (data.category)            setCategory(data.category as Category);

      setScreenshotState("done");
    } catch {
      setError("Something went wrong reading the screenshot.");
      setScreenshotState("error");
    }
  }

  // ── Fetch Details (fills form without running analysis) ───────────────────
  async function handleFetchDetails() {
    const url = listingUrl.trim();
    if (!url) return;

    setFetchState("loading");
    setError(null);

    try {
      const res  = await fetch("/api/scrape", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url }),
      });
      const data = await res.json() as ScrapedListing & { error?: string; message?: string };

      if (!res.ok) {
        setError(data.message ?? "Could not read this listing automatically. Fill in the details manually.");
        setFetchState("error");
        setShowManual(true);
        return;
      }

      // Populate every field we got back
      if (data.platform)            setPlatform(data.platform as Platform);
      if (data.title?.trim())        setTitle(data.title.trim());
      if (data.description?.trim())  setDescription(data.description.trim());
      if (data.price != null)        setPrice(String(data.price));
      if (data.category)             setCategory(data.category as Category);
      if (data.imageUrls?.length)    setImageUrls(data.imageUrls.join(", "));
      if (data.sellerUsername)       setSellerUser(data.sellerUsername);
      if (data.sellerAccountAge != null) setAccountAge(String(data.sellerAccountAge));
      if (data.sellerReviewCount != null) setReviewCount(String(data.sellerReviewCount));
      if (data.sellerAvgRating   != null) setAvgRating(String(data.sellerAvgRating));
      if (data.sellerIsVerified)     setIsVerified(true);

      setFetchState("done");
      setShowManual(true);

      if (data.partial) {
        setError("We found the listing but couldn't read the price. Fill in any missing fields and click Run Analysis.");
      }
    } catch {
      setError("Something went wrong fetching the listing. Fill in the details manually.");
      setFetchState("error");
      setShowManual(true);
    }
  }

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
      const [response] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        new Promise((resolve) => setTimeout(resolve, 2800)),
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

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <AnalysisLoader />;

  if (!showManual) return null;

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

        {/* URL + Screenshot */}
        <div>
          <Label optional>Listing URL</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={listingUrl}
              onChange={(e) => {
                const val = e.target.value;
                setListingUrl(val);
                setFetchState("idle");
                // Auto-detect platform from URL
                const detected = detectPlatform(val);
                if (detected !== "manual") setPlatform(detected);
              }}
              placeholder="https://www.ebay.com/itm/..."
            />
            {listingUrl.trim() && (
              <button
                type="button"
                onClick={handleFetchDetails}
                disabled={fetchState === "loading"}
                className="shrink-0 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/60 transition-colors mono whitespace-nowrap disabled:opacity-50"
              >
                {fetchState === "loading" ? "Fetching…" : fetchState === "done" ? "Re-fetch" : "Fetch Details"}
              </button>
            )}
          </div>

          {/* Screenshot upload row */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 border-t border-[#1e2a3f]" />
            <span className="text-[10px] text-slate-600 mono uppercase tracking-wider shrink-0">or</span>
            <div className="flex-1 border-t border-[#1e2a3f]" />
          </div>

          <label className="mt-2 flex items-center gap-2 cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleScreenshot(file);
                e.target.value = "";
              }}
            />
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors w-full justify-center
              ${screenshotState === "done"
                ? "border-green-500/40 bg-green-500/10 text-green-400"
                : screenshotState === "loading"
                ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                : screenshotState === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-[#1e2a3f] bg-[#111827] text-slate-400 group-hover:border-purple-500/40 group-hover:text-purple-300"
              }`}>
              {screenshotState === "loading" ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  <span>Reading screenshot…</span>
                </>
              ) : screenshotState === "done" ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Screenshot extracted — upload another to update</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span>Upload a screenshot to auto-fill from image</span>
                  <span className="ml-1 text-[10px] text-purple-400 border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 rounded mono">AI</span>
                </>
              )}
            </div>
          </label>
          <p className="mt-1 text-xs text-slate-600">
            Works for Facebook Marketplace, or any listing you can screenshot. Claude reads price, title, seller info directly from the image.
          </p>
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
