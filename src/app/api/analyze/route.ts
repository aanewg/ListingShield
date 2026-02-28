import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runFullAnalysis } from "@/lib/detection-engine";
import { scrapeListing } from "@/lib/scraper";
import { analyzeWithAI, blendedTier } from "@/lib/ai-analysis";

export const maxDuration = 60; // allow up to 60s for scrape + AI

export async function POST(req: NextRequest) {
  try {
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
      imageUrls,
      listingUrl,
    } = body;

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
        return NextResponse.json(
          {
            error:   "SCRAPE_PARTIAL",
            message: "We found the listing but couldn't read the price. The form below is pre-filled — just add the price and hit Run Analysis.",
            partial: {
              title:         scraped.title,
              description:   scraped.description,
              imageUrls:     scraped.imageUrls,
              sellerUsername: scraped.sellerUsername,
              category:      scraped.category,
            },
          },
          { status: 422 }
        );
      }

      title          = scraped.title;
      description    = scraped.description;
      price          = scraped.price;
      imageUrls      = scraped.imageUrls.length ? scraped.imageUrls : imageUrls;
      sellerUsername = sellerUsername ?? scraped.sellerUsername;
      category       = category       ?? scraped.category;
    }

    // Basic validation
    if (!platform || !title || !description || price === undefined || price === null) {
      return NextResponse.json(
        { error: "platform, title, description, and price are required." },
        { status: 400 }
      );
    }

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
        sellerUsername: sellerUsername ?? null,
        sellerAccountAge: sellerAccountAge ? Number(sellerAccountAge) : null,
        sellerReviewCount: sellerReviewCount ? Number(sellerReviewCount) : null,
        sellerAvgRating: sellerAvgRating ? Number(sellerAvgRating) : null,
        sellerIsVerified: sellerIsVerified ?? false,
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
