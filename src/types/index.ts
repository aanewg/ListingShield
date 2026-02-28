// ─── Enums ────────────────────────────────────────────────────────────────────

export type Platform =
  | "mercari"
  | "ebay"
  | "facebook"
  | "poshmark"
  | "depop"
  | "manual";

export type Category =
  | "Electronics"
  | "Clothing"
  | "Shoes"
  | "Handbags"
  | "Beauty"
  | "Home"
  | "Toys"
  | "Collectibles"
  | "Other";

export type Severity = "low" | "medium" | "high" | "critical";

export type TrustTier =
  | "highly_trusted"
  | "looks_good"
  | "caution"
  | "risky"
  | "likely_scam";

export type FlagType =
  | "PRICE_WAY_BELOW_MARKET"
  | "PRICE_BELOW_MARKET"
  | "NEW_SELLER_ACCOUNT"
  | "VERY_NEW_SELLER_ACCOUNT"
  | "LOW_REVIEW_COUNT"
  | "STOCK_PHOTO_SUSPECTED"
  | "VAGUE_DESCRIPTION"
  | "SHORT_DESCRIPTION"
  | "KEYWORD_STUFFING"
  | "OFF_PLATFORM_LANGUAGE"
  | "REVIEW_BURST_PATTERN"
  | "NO_AUTHENTICITY_PROOF"
  | "HIGH_LISTING_VELOCITY"
  | "DESCRIPTION_IMAGE_MISMATCH"
  | "CATEGORY_MISMATCH";

export type ReportType =
  | "scam"
  | "counterfeit"
  | "fake_reviews"
  | "bait_switch"
  | "other";

// ─── Detection engine types ────────────────────────────────────────────────────

export interface DetectedFlag {
  flagType: FlagType;
  severity: Severity;
  title: string;
  description: string;
  confidence: number; // 0.0 – 1.0
}

export interface DetectedBonus {
  title: string;
  points: number;
}

export interface PricingAnalysisResult {
  marketAvgPrice: number | null;
  deviationPercent: number | null; // negative = listing is below market
  flags: DetectedFlag[];
}

export interface SellerAnalysisResult {
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: DetectedFlag[];
  bonuses: DetectedBonus[];
}

export interface DescriptionAnalysisResult {
  wordCount: number;
  qualityScore: number; // 0-100
  flags: DetectedFlag[];
  bonuses: DetectedBonus[];
}

export interface TrustScoreResult {
  score: number; // 0-100
  tier: TrustTier;
  breakdown: {
    base: number;
    deductions: { reason: string; points: number }[];
    bonuses: { reason: string; points: number }[];
    final: number;
  };
}

// ─── API request / response shapes ────────────────────────────────────────────

export interface AnalyzeRequest {
  platform: Platform;
  title: string;
  description: string;
  price: number;
  category?: Category;
  sellerUsername?: string;
  sellerAccountAge?: number; // days
  sellerReviewCount?: number;
  sellerAvgRating?: number;
  sellerIsVerified?: boolean;
  imageUrls?: string[];
  listingUrl?: string;
}

export interface AnalyzeResponse {
  id: string;
  trustScore: number;
  trustTier: TrustTier;
  riskFlags: DetectedFlag[];
  priceAnalysis: PricingAnalysisResult;
  sellerAssessment: SellerAnalysisResult;
  descriptionAnalysis: DescriptionAnalysisResult;
}

export interface FullAnalysis {
  id: string;
  listingUrl: string | null;
  platform: Platform;
  title: string;
  description: string;
  price: number;
  marketAvgPrice: number | null;
  category: Category | null;
  sellerUsername: string | null;
  sellerAccountAge: number | null;
  sellerReviewCount: number | null;
  sellerAvgRating: number | null;
  sellerIsVerified: boolean;
  imageUrls: string[];
  trustScore: number;
  trustTier: TrustTier;
  riskFlags: DetectedFlag[];
  createdAt: string;
}

export interface ReportRequest {
  listingUrl: string;
  platform: Platform;
  reportType: ReportType;
  details?: string;
}

export interface StatsResponse {
  totalAnalyzed: number;
  avgScore: number;
  flagBreakdown: Record<FlagType, number>;
  platformBreakdown: Record<Platform, number>;
}
