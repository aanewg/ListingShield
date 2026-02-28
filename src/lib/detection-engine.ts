/**
 * ListingShield — Detection Engine (v1, rule-based)
 *
 * Three analysis functions + a final trust-score calculator.
 * Designed so real APIs (eBay Browse, Google Vision, etc.) can replace
 * the heuristics later without changing the calling interface.
 */

import type {
  Category,
  DetectedBonus,
  DetectedFlag,
  DescriptionAnalysisResult,
  PricingAnalysisResult,
  SellerAnalysisResult,
  TrustScoreResult,
  TrustTier,
} from "@/types";
import { getDeviationPercent, getMarketAvgPrice } from "./price-reference";

// ─── 1. Price Analysis ─────────────────────────────────────────────────────────

export function analyzePricing(
  price: number,
  category: string | null | undefined,
  title: string
): PricingAnalysisResult {
  const marketAvgPrice = getMarketAvgPrice(title, category);
  const flags: DetectedFlag[] = [];

  if (marketAvgPrice === null) {
    return { marketAvgPrice: null, deviationPercent: null, flags };
  }

  const deviationPercent = getDeviationPercent(price, marketAvgPrice);

  if (deviationPercent < -50) {
    flags.push({
      flagType: "PRICE_WAY_BELOW_MARKET",
      severity: "critical",
      title: "Price Suspiciously Low",
      description: `Listed at $${price.toFixed(2)} - more than 50% below the typical market price of ~$${marketAvgPrice.toFixed(0)} for this item. This is a strong indicator of counterfeit goods, a bait-and-switch, or a non-existent listing.`,
      confidence: 0.9,
    });
  } else if (deviationPercent < -40) {
    flags.push({
      flagType: "PRICE_BELOW_MARKET",
      severity: "high",
      title: "Price Well Below Market",
      description: `Listed at $${price.toFixed(2)}, which is ${Math.abs(deviationPercent).toFixed(0)}% below the estimated market average of ~$${marketAvgPrice.toFixed(0)}. Legitimate bargains exist, but this gap warrants extra scrutiny.`,
      confidence: 0.8,
    });
  } else if (deviationPercent < -25) {
    flags.push({
      flagType: "PRICE_BELOW_MARKET",
      severity: "medium",
      title: "Price Below Market Average",
      description: `Listed at $${price.toFixed(2)}, about ${Math.abs(deviationPercent).toFixed(0)}% below the estimated market average of ~$${marketAvgPrice.toFixed(0)}. Worth verifying authenticity before purchasing.`,
      confidence: 0.65,
    });
  }

  return { marketAvgPrice, deviationPercent, flags };
}

// ─── 2. Seller Profile Analysis ───────────────────────────────────────────────

export function analyzeSellerProfile(
  accountAge: number | null | undefined,         // days
  reviewCount: number | null | undefined,
  avgRating: number | null | undefined,
  isVerified: boolean,
  listingVelocity?: number | null               // listings in last 24h (optional)
): SellerAnalysisResult {
  const flags: DetectedFlag[] = [];
  const bonuses: DetectedBonus[] = [];
  let riskLevel: SellerAnalysisResult["riskLevel"] = "low";

  // Account age
  if (accountAge !== null && accountAge !== undefined) {
    if (accountAge < 7) {
      flags.push({
        flagType: "VERY_NEW_SELLER_ACCOUNT",
        severity: "critical",
        title: "Brand-New Seller Account",
        description: `This account is only ${accountAge} day(s) old. Scam accounts are frequently created fresh to run schemes before getting banned. Avoid high-value purchases from accounts this new.`,
        confidence: 0.92,
      });
      riskLevel = "critical";
    } else if (accountAge < 30) {
      flags.push({
        flagType: "NEW_SELLER_ACCOUNT",
        severity: "high",
        title: "Very New Seller Account",
        description: `Account is ${accountAge} days old. New accounts with no track record carry higher risk — there is no history to verify trustworthiness.`,
        confidence: 0.75,
      });
      riskLevel = "high";
    } else if (accountAge >= 365) {
      bonuses.push({ title: "Established account (1+ year)", points: 5 });
    }
  }

  // Review count
  if (reviewCount !== null && reviewCount !== undefined) {
    if (reviewCount < 5) {
      flags.push({
        flagType: "LOW_REVIEW_COUNT",
        severity: "medium",
        title: "Few or No Reviews",
        description: `Seller has only ${reviewCount} review(s). Without a review history it is hard to assess trustworthiness. Proceed carefully, especially for higher-priced items.`,
        confidence: 0.7,
      });
      if (riskLevel === "low") riskLevel = "medium";
    } else if (reviewCount >= 50 && avgRating !== null && avgRating !== undefined && avgRating >= 4.5) {
      bonuses.push({ title: "50+ reviews with 4.5+ rating", points: 5 });
    }
  }

  // Average rating — burst pattern heuristic
  if (
    reviewCount !== null && reviewCount !== undefined &&
    avgRating !== null && avgRating !== undefined &&
    reviewCount >= 5 && reviewCount < 15 && avgRating === 5.0
  ) {
    flags.push({
      flagType: "REVIEW_BURST_PATTERN",
      severity: "high",
      title: "Suspicious Perfect Rating Pattern",
      description: `Seller has a perfect 5.0 rating across ${reviewCount} reviews on a relatively new account. This pattern can indicate fabricated or incentivized reviews.`,
      confidence: 0.6,
    });
    if (riskLevel !== "critical") riskLevel = "high";
  }

  // Listing velocity
  if (listingVelocity !== null && listingVelocity !== undefined && listingVelocity > 20) {
    flags.push({
      flagType: "HIGH_LISTING_VELOCITY",
      severity: "medium",
      title: "High Listing Volume",
      description: `Seller posted ${listingVelocity} listings in the past 24 hours. While some resellers are high-volume, unusually rapid posting can indicate a bulk scam operation or dropshipping scheme.`,
      confidence: 0.55,
    });
    if (riskLevel === "low") riskLevel = "medium";
  }

  // Verified bonus
  if (isVerified) {
    bonuses.push({ title: "Seller identity verified", points: 10 });
  }

  return { riskLevel, flags, bonuses };
}

// ─── 3. Description / Title Analysis ─────────────────────────────────────────

const OFF_PLATFORM_PATTERN =
  /\b(zelle|venmo|cash\s*app|cashapp|paypal|wire\s*transfer|money\s*order|western\s*union|text\s*me|call\s*me|email\s*me|dm\s*me|message\s*me outside|whatsapp)\b|(\b[\w.+]+@[\w-]+\.\w{2,}\b)|(\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)/i;

const LUXURY_KEYWORDS = [
  "louis vuitton", "lv", "chanel", "gucci", "prada", "hermes", "hermès",
  "balenciaga", "dior", "fendi", "burberry", "versace", "bottega",
  "goyard", "celine", "givenchy", "saint laurent", "ysl",
];

const AUTHENTICITY_TERMS = [
  "authentic", "genuine", "real", "original", "receipt", "proof",
  "serial number", "dust bag", "certificate", "hologram", "date code",
  "authentication", "verified",
];

const CONDITION_TERMS = [
  "new", "used", "like new", "lightly used", "gently used", "nwt",
  "nwob", "bnib", "good condition", "fair condition", "excellent",
  "pre-owned", "worn once",
];

export function analyzeDescription(
  title: string,
  description: string,
  category?: string | null
): DescriptionAnalysisResult {
  const flags: DetectedFlag[] = [];
  const bonuses: DetectedBonus[] = [];

  const fullText = `${title} ${description}`.toLowerCase();
  const words = description.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  let qualityScore = 100;

  // ── Short description
  if (wordCount < 20) {
    flags.push({
      flagType: "SHORT_DESCRIPTION",
      severity: "low",
      title: "Very Short Description",
      description: `The listing description is only ${wordCount} word(s). Legitimate sellers typically provide detailed information about condition, size, and any flaws.`,
      confidence: 0.8,
    });
    qualityScore -= 15;
  } else if (wordCount >= 50) {
    bonuses.push({ title: "Detailed description", points: 3 });
    qualityScore += 5;
  }

  // ── Off-platform payment language
  if (OFF_PLATFORM_PATTERN.test(fullText)) {
    flags.push({
      flagType: "OFF_PLATFORM_LANGUAGE",
      severity: "critical",
      title: "Off-Platform Payment Language Detected",
      description:
        "The listing contains references to off-platform payment methods or contact info (Zelle, Venmo, phone numbers, email addresses, etc.). Moving transactions outside the marketplace removes all buyer protections — this is a major scam indicator.",
      confidence: 0.95,
    });
    qualityScore -= 40;
  }

  // ── Keyword stuffing in title
  const titleWords = title.split(/[\s,/|]+/).filter((w) => w.length > 2);
  const titleBrands = titleWords.filter((w) =>
    LUXURY_KEYWORDS.some((b) => b.includes(w.toLowerCase()))
  );
  if (title.split(",").length > 8 || titleWords.length > 50 || titleBrands.length >= 3) {
    flags.push({
      flagType: "KEYWORD_STUFFING",
      severity: "medium",
      title: "Keyword Stuffing in Title",
      description:
        "The listing title appears to contain an excessive number of brand names or keywords. This is a common tactic to game search algorithms and can indicate the seller is not being straightforward about the item.",
      confidence: 0.7,
    });
    qualityScore -= 12;
  }

  // ── Vague description (no condition, no specifics)
  const hasCondition = CONDITION_TERMS.some((t) => fullText.includes(t));
  const hasSize =
    /\b(size\s*\d+|xs|sm|med|small|medium|large|xl|xxl|\d+"\s*(x|×)\s*\d+"|\d+\s*oz|\d+\s*ml)\b/i.test(
      fullText
    );

  if (!hasCondition && wordCount > 5) {
    flags.push({
      flagType: "VAGUE_DESCRIPTION",
      severity: "medium",
      title: "Item Condition Not Stated",
      description:
        "The listing does not specify the condition of the item (new, used, like new, etc.). Reputable sellers always disclose condition so buyers know what to expect.",
      confidence: 0.72,
    });
    qualityScore -= 10;
  }

  if (hasCondition && hasSize) {
    bonuses.push({ title: "Condition + measurements specified", points: 3 });
  }

  // ── Luxury / designer items without authenticity proof
  const isLuxuryItem = LUXURY_KEYWORDS.some((kw) => fullText.includes(kw));
  const hasAuthenticityProof = AUTHENTICITY_TERMS.some((t) =>
    fullText.includes(t)
  );

  if (isLuxuryItem && !hasAuthenticityProof) {
    flags.push({
      flagType: "NO_AUTHENTICITY_PROOF",
      severity: "low",
      title: "No Authenticity Proof Mentioned",
      description:
        "This appears to be a luxury / designer item but the listing makes no mention of authenticity proof, receipts, date codes, or certificates. Authentic resellers typically provide these details.",
      confidence: 0.65,
    });
    qualityScore -= 8;
  }

  // ── Category mismatch heuristic
  if (category) {
    const electronicsKeywords = ["iphone", "macbook", "airpod", "galaxy", "ps5", "xbox"];
    const isElectronicItem = electronicsKeywords.some((k) => fullText.includes(k));
    if (isElectronicItem && category !== "Electronics") {
      flags.push({
        flagType: "CATEGORY_MISMATCH",
        severity: "low",
        title: "Category May Be Mismatched",
        description:
          "The item appears to be an electronic product but is listed under a different category. This could be accidental or an attempt to avoid detection.",
        confidence: 0.5,
      });
      qualityScore -= 5;
    }
  }

  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return { wordCount, qualityScore, flags, bonuses };
}

// ─── 4. Trust Score Calculator ────────────────────────────────────────────────

const SEVERITY_DEDUCTIONS: Record<string, { min: number; max: number }> = {
  critical: { min: 25, max: 40 },
  high: { min: 15, max: 25 },
  medium: { min: 8, max: 15 },
  low: { min: 3, max: 8 },
};

function severityDeduction(severity: string, confidence: number): number {
  const range = SEVERITY_DEDUCTIONS[severity] ?? { min: 3, max: 8 };
  // Scale deduction by confidence
  const base = (range.min + range.max) / 2;
  return Math.round(base * confidence);
}

function trustTierFromScore(score: number): TrustTier {
  if (score >= 90) return "highly_trusted";
  if (score >= 70) return "looks_good";
  if (score >= 50) return "caution";
  if (score >= 30) return "risky";
  return "likely_scam";
}

export function calculateTrustScore(
  allFlags: DetectedFlag[],
  allBonuses: DetectedBonus[]
): TrustScoreResult {
  const base = 100;
  const deductions: { reason: string; points: number }[] = [];
  const bonusLog: { reason: string; points: number }[] = [];

  for (const flag of allFlags) {
    const pts = severityDeduction(flag.severity, flag.confidence);
    deductions.push({ reason: flag.title, points: pts });
  }

  for (const bonus of allBonuses) {
    bonusLog.push({ reason: bonus.title, points: bonus.points });
  }

  const totalDeductions = deductions.reduce((acc, d) => acc + d.points, 0);
  const totalBonuses = bonusLog.reduce((acc, b) => acc + b.points, 0);

  const raw = base - totalDeductions + totalBonuses;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const tier = trustTierFromScore(score);

  return {
    score,
    tier,
    breakdown: {
      base,
      deductions,
      bonuses: bonusLog,
      final: score,
    },
  };
}

// ─── 5. Combined runner ────────────────────────────────────────────────────────

export interface AnalysisInput {
  platform: string;
  title: string;
  description: string;
  price: number;
  category?: string | null;
  sellerUsername?: string | null;
  sellerAccountAge?: number | null;
  sellerReviewCount?: number | null;
  sellerAvgRating?: number | null;
  sellerIsVerified?: boolean;
  imageUrls?: string[];
  listingVelocity?: number | null;
}

export interface AnalysisOutput {
  trustScore: number;
  trustTier: TrustTier;
  marketAvgPrice: number | null;
  allFlags: DetectedFlag[];
  priceAnalysis: PricingAnalysisResult;
  sellerAnalysis: SellerAnalysisResult;
  descriptionAnalysis: DescriptionAnalysisResult;
  scoreBreakdown: TrustScoreResult;
}

export function runFullAnalysis(input: AnalysisInput): AnalysisOutput {
  const priceAnalysis = analyzePricing(input.price, input.category, input.title);
  const sellerAnalysis = analyzeSellerProfile(
    input.sellerAccountAge,
    input.sellerReviewCount,
    input.sellerAvgRating,
    input.sellerIsVerified ?? false,
    input.listingVelocity
  );
  const descriptionAnalysis = analyzeDescription(
    input.title,
    input.description,
    input.category
  );

  const allFlags = [
    ...priceAnalysis.flags,
    ...sellerAnalysis.flags,
    ...descriptionAnalysis.flags,
  ];
  const allBonuses = [
    ...sellerAnalysis.bonuses,
    ...descriptionAnalysis.bonuses,
  ];

  const scoreBreakdown = calculateTrustScore(allFlags, allBonuses);

  return {
    trustScore: scoreBreakdown.score,
    trustTier: scoreBreakdown.tier,
    marketAvgPrice: priceAnalysis.marketAvgPrice,
    allFlags,
    priceAnalysis,
    sellerAnalysis,
    descriptionAnalysis,
    scoreBreakdown,
  };
}
