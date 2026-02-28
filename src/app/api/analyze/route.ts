import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runFullAnalysis } from "@/lib/detection-engine";
import { scrapeListing } from "@/lib/scraper";

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
          { error: "SCRAPE_FAILED", message: "Could not read this listing automatically. Please fill in the details manually." },
          { status: 422 }
        );
      }
      title         = scraped.title;
      description   = scraped.description;
      price         = scraped.price;
      imageUrls     = scraped.imageUrls.length ? scraped.imageUrls : imageUrls;
      sellerUsername = sellerUsername ?? scraped.sellerUsername;
      category      = category       ?? scraped.category;
    }

    // Basic validation
    if (!platform || !title || !description || price === undefined || price === null) {
      return NextResponse.json(
        { error: "platform, title, description, and price are required." },
        { status: 400 }
      );
    }

    const result = runFullAnalysis({
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

    // Persist to database
    const analysis = await db.listingAnalysis.create({
      data: {
        listingUrl: listingUrl ?? null,
        platform,
        title,
        description,
        price: Number(price),
        marketAvgPrice: result.marketAvgPrice,
        category: category ?? null,
        sellerUsername: sellerUsername ?? null,
        sellerAccountAge: sellerAccountAge ? Number(sellerAccountAge) : null,
        sellerReviewCount: sellerReviewCount ? Number(sellerReviewCount) : null,
        sellerAvgRating: sellerAvgRating ? Number(sellerAvgRating) : null,
        sellerIsVerified: sellerIsVerified ?? false,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
        trustScore: result.trustScore,
        trustTier: result.trustTier,
        riskFlags: {
          create: result.allFlags.map((f) => ({
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
      id: analysis.id,
      trustScore: result.trustScore,
      trustTier: result.trustTier,
      riskFlags: result.allFlags,
      priceAnalysis: result.priceAnalysis,
      sellerAssessment: result.sellerAnalysis,
      descriptionAnalysis: result.descriptionAnalysis,
    });
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
