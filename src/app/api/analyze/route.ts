import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runFullAnalysis } from "@/lib/detection-engine";
import { scrapeListing } from "@/lib/scraper";
import { analyzeWithAI, blendedTier } from "@/lib/ai-analysis";
import {
  isAllowedMarketplaceUrl,
  checkRateLimit,
  getClientIp,
  sanitizeStr,
  sanitizeNumber,
  VALID_PLATFORMS,
} from "@/lib/security";

export const maxDuration = 60; // allow up to 60s for scrape + AI

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 10 requests / minute / IP ────────────────────────────────
    const ip = getClientIp(req.headers);
    if (!checkRateLimit(`analyze:${ip}`, 10)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();

    let {
      platform,
      title,
      description,
      price,
      category,
      sellerUsername,
      sellerAccountAge,
      sellerReviewCount,
      sellerAvgRating,
      sellerIsVerified,
      sellerProfileUrl,
      sellerLocation,
      sellerItemsSold,
      imageUrls,
      listingUrl,
    } = body;

    // ── SSRF guard ───────────────────────────────────────────────────────────
    if (listingUrl) {
      listingUrl = sanitizeStr(listingUrl, 2048);
      if (!isAllowedMarketplaceUrl(listingUrl ?? "")) {
        return NextResponse.json(
          {
            error:
              "URL must be from a supported marketplace (eBay, Mercari, Facebook Marketplace, Poshmark, or Depop) and use https://.",
          },
          { status: 400 }
        );
      }
    }

    // ── Auto-scrape when only a URL is provided ─────────────────────────────
    if (listingUrl && !title) {
      const scraped = await scrapeListing(listingUrl);

      if (!scraped) {
        return NextResponse.json(
          { error: "SCRAPE_FAILED", message: "Could not automatically read this listing. Please fill in the details manually." },
          { status: 422 }
        );
      }

      // Partial scrape — got some data but price is missing; send it back so
      // the form can pre-fill and ask the user only for what's missing.
      if (scraped.partial || !scraped.price) {
        const isFacebook = listingUrl?.includes("facebook.com");
        const partialMsg = isFacebook
          ? "Facebook Marketplace hides prices until you're logged in — we can't read it automatically. The form is pre-filled with what we found. Add the price and any missing details, then hit Run Analysis."
          : "We found the listing but couldn't read the price. The form below is pre-filled — just add the price and hit Run Analysis.";
        return NextResponse.json(
          {
            error:   "SCRAPE_PARTIAL",
            message: partialMsg,
            partial: {
              title:             scraped.title,
              description:       scraped.description,
              imageUrls:         scraped.imageUrls,
              sellerUsername:    scraped.sellerUsername,
              sellerAccountAge:  scraped.sellerAccountAge,
              sellerReviewCount: scraped.sellerReviewCount,
              sellerAvgRating:   scraped.sellerAvgRating,
              sellerIsVerified:  scraped.sellerIsVerified,
              sellerProfileUrl:  scraped.sellerProfileUrl,
              sellerLocation:    scraped.sellerLocation,
              sellerItemsSold:   scraped.sellerItemsSold,
              category:          scraped.category,
            },
          },
          { status: 422 }
        );
      }

      title             = scraped.title;
      description       = scraped.description;
      price             = scraped.price;
      imageUrls         = scraped.imageUrls.length ? scraped.imageUrls : imageUrls;
      sellerUsername    = sellerUsername    ?? scraped.sellerUsername;
      sellerAccountAge  = sellerAccountAge  ?? scraped.sellerAccountAge;
      sellerReviewCount = sellerReviewCount ?? scraped.sellerReviewCount;
      sellerAvgRating   = sellerAvgRating   ?? scraped.sellerAvgRating;
      sellerIsVerified  = sellerIsVerified  ?? scraped.sellerIsVerified;
      sellerProfileUrl  = sellerProfileUrl  ?? scraped.sellerProfileUrl;
      sellerLocation    = sellerLocation    ?? scraped.sellerLocation;
      sellerItemsSold   = sellerItemsSold   ?? scraped.sellerItemsSold;
      category          = category          ?? scraped.category;
    }

    // ── Input validation & sanitization ─────────────────────────────────────
    if (!VALID_PLATFORMS.has(platform)) {
      return NextResponse.json(
        { error: "platform must be one of: facebook, ebay, mercari, poshmark, depop, other." },
        { status: 400 }
      );
    }

    title            = sanitizeStr(title,            500);
    description      = sanitizeStr(description,     10_000);
    category         = sanitizeStr(category,        100);
    sellerUsername   = sanitizeStr(sellerUsername,  200);
    sellerProfileUrl = sanitizeStr(sellerProfileUrl, 2048) ?? null;
    sellerLocation   = sanitizeStr(sellerLocation,   200)  ?? null;

    const cleanPrice  = sanitizeNumber(price,             0, 1_000_000);
    sellerAccountAge  = sanitizeNumber(sellerAccountAge,  0,    36_500) ?? null;
    sellerReviewCount = sanitizeNumber(sellerReviewCount, 0, 10_000_000) ?? null;
    sellerAvgRating   = sanitizeNumber(sellerAvgRating,   0,         5) ?? null;
    sellerItemsSold   = sanitizeNumber(sellerItemsSold,   0, 10_000_000) ?? null;
    sellerIsVerified  = typeof sellerIsVerified === "boolean" ? sellerIsVerified : false;

    imageUrls = Array.isArray(imageUrls)
      ? (imageUrls as unknown[])
          .filter((u): u is string => typeof u === "string")
          .slice(0, 20)
          .map((u) => u.slice(0, 2048))
      : [];

    if (!title || !description || cleanPrice === undefined) {
      return NextResponse.json(
        { error: "platform, title, description, and price are required." },
        { status: 400 }
      );
    }

    price = cleanPrice;

    const ruleResult = runFullAnalysis({
      platform,
      title,
      description,
      price: Number(price),
      category,
      sellerUsername,
      sellerAccountAge: sellerAccountAge ? Number(sellerAccountAge) : null,
      sellerReviewCount: sellerReviewCount ? Number(sellerReviewCount) : null,
      sellerAvgRating: sellerAvgRating ? Number(sellerAvgRating) : null,
      sellerIsVerified: sellerIsVerified ?? false,
      imageUrls: imageUrls ?? [],
    });

    // ── AI analysis (runs in parallel with nothing — after rule engine) ─────
    const aiResult = await analyzeWithAI({
      platform,
      title,
      description,
      price:             Number(price),
      marketAvgPrice:    ruleResult.marketAvgPrice ?? null,
      category,
      sellerUsername,
      sellerAccountAge:  sellerAccountAge  ? Number(sellerAccountAge)  : null,
      sellerReviewCount: sellerReviewCount ? Number(sellerReviewCount) : null,
      sellerAvgRating:   sellerAvgRating   ? Number(sellerAvgRating)   : null,
      sellerIsVerified:  sellerIsVerified  ?? false,
      ruleScore:         ruleResult.trustScore,
      ruleFlags:         ruleResult.allFlags,
    });

    // Blend scores: 40% rule-based, 60% AI (AI wins if available)
    const finalScore = aiResult
      ? Math.round(ruleResult.trustScore * 0.4 + aiResult.aiScore * 0.6)
      : ruleResult.trustScore;
    const finalTier = aiResult ? blendedTier(finalScore) : ruleResult.trustTier;

    // Persist to database
    const analysis = await db.listingAnalysis.create({
      data: {
        listingUrl: listingUrl ?? null,
        platform,
        title,
        description,
        price: Number(price),
        marketAvgPrice: ruleResult.marketAvgPrice,
        category: category ?? null,
        sellerUsername:   sellerUsername   ?? null,
        sellerAccountAge: sellerAccountAge ? Number(sellerAccountAge)  : null,
        sellerReviewCount: sellerReviewCount ? Number(sellerReviewCount) : null,
        sellerAvgRating:  sellerAvgRating  ? Number(sellerAvgRating)  : null,
        sellerIsVerified: sellerIsVerified ?? false,
        sellerProfileUrl: sellerProfileUrl ?? null,
        sellerLocation:   sellerLocation   ?? null,
        sellerItemsSold:  sellerItemsSold  ? Number(sellerItemsSold)  : null,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
        trustScore: finalScore,
        trustTier:  finalTier,
        aiAnalysis: aiResult ? JSON.stringify(aiResult) : null,
        riskFlags: {
          create: ruleResult.allFlags.map((f) => ({
            flagType: f.flagType,
            severity: f.severity,
            title: f.title,
            description: f.description,
            confidence: f.confidence,
          })),
        },
      },
    });

    return NextResponse.json({
      id:                  analysis.id,
      trustScore:          finalScore,
      trustTier:           finalTier,
      riskFlags:           ruleResult.allFlags,
      priceAnalysis:       ruleResult.priceAnalysis,
      sellerAssessment:    ruleResult.sellerAnalysis,
      descriptionAnalysis: ruleResult.descriptionAnalysis,
      aiAnalysis:          aiResult,
    });
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
