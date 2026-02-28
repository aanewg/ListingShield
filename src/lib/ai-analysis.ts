import Anthropic from "@anthropic-ai/sdk";
import type { DetectedFlag, TrustTier } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AIFlag {
  title:       string;
  severity:    "critical" | "high" | "medium" | "low";
  description: string;
  confidence:  number;
}

export interface AIAnalysisResult {
  aiScore:        number;        // 0-100
  summary:        string;        // 2-3 sentence plain-English verdict
  recommendation: string;        // single action sentence for the buyer
  scamType:       string | null; // most likely scam category if any
  additionalFlags: AIFlag[];     // flags not caught by the rule engine
}

export function blendedTier(score: number): TrustTier {
  if (score >= 90) return "highly_trusted";
  if (score >= 70) return "looks_good";
  if (score >= 50) return "caution";
  if (score >= 30) return "risky";
  return "likely_scam";
}

interface AnalysisInput {
  platform:         string;
  title:            string;
  description:      string;
  price:            number;
  marketAvgPrice:   number | null;
  category?:        string | null;
  sellerUsername?:  string | null;
  sellerAccountAge?: number | null;
  sellerReviewCount?: number | null;
  sellerAvgRating?:  number | null;
  sellerIsVerified?: boolean;
  ruleScore:        number;
  ruleFlags:        DetectedFlag[];
}

export async function analyzeWithAI(input: AnalysisInput): Promise<AIAnalysisResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const {
    platform, title, description, price, marketAvgPrice, category,
    sellerUsername, sellerAccountAge, sellerReviewCount, sellerAvgRating,
    sellerIsVerified, ruleScore, ruleFlags,
  } = input;

  const priceContext = marketAvgPrice
    ? `$${price} (market avg: ~$${marketAvgPrice} — ${Math.round(((price - marketAvgPrice) / marketAvgPrice) * 100)}% vs market)`
    : `$${price} (no market reference available)`;

  const sellerLines = [
    sellerUsername    ? `Username: ${sellerUsername}`                              : null,
    sellerAccountAge  != null ? `Account age: ${sellerAccountAge} days`           : null,
    sellerReviewCount != null ? `Review count: ${sellerReviewCount}`              : null,
    sellerAvgRating   != null ? `Avg rating: ${sellerAvgRating}/5`               : null,
    sellerIsVerified            ? `ID-verified by platform: yes`                  : null,
  ].filter(Boolean).join("\n") || "No seller information provided.";

  const flagLines = ruleFlags.length
    ? ruleFlags.map((f) => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`).join("\n")
    : "None detected by rule engine.";

  const prompt = `You are an expert fraud analyst for online marketplaces (eBay, Mercari, Facebook Marketplace, Poshmark, Depop). Your job is to evaluate whether a listing is legitimate or a potential scam, counterfeit, or fraud.

LISTING
Platform: ${platform}
Title: ${title}
Price: ${priceContext}
${category ? `Category: ${category}` : ""}
Description:
"""
${description.slice(0, 1500)}${description.length > 1500 ? "…[truncated]" : ""}
"""

SELLER
${sellerLines}

RULE-BASED FLAGS ALREADY DETECTED (score: ${ruleScore}/100)
${flagLines}

Analyze this listing holistically. Consider what the rule engine may have missed — context, wording patterns, cultural red flags, brand authentication signals, pricing realism, and anything else suspicious or reassuring.

Respond with ONLY a JSON object in this exact shape:
{
  "aiScore": <integer 0-100, where 100 = completely trustworthy, 0 = definite scam>,
  "summary": "<2-3 sentences explaining your overall assessment in plain English>",
  "recommendation": "<one clear sentence telling the buyer what to do>",
  "scamType": <null or one of: "counterfeit" | "fake_listing" | "price_manipulation" | "account_farming" | "bait_switch" | "off_platform_payment" | "stolen_goods">,
  "additionalFlags": [
    {
      "title": "<short flag name>",
      "severity": "<critical | high | medium | low>",
      "description": "<1-2 sentences explaining the concern>",
      "confidence": <0.0-1.0>
    }
  ]
}

Only include additionalFlags for concerns NOT already captured in the rule-based flags above. Return an empty array if nothing new was found.`;

  try {
    const message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Extract JSON from the response (handle markdown code fences)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[1]) as AIAnalysisResult;

    // Sanitise
    return {
      aiScore:        Math.max(0, Math.min(100, Math.round(Number(parsed.aiScore) || ruleScore))),
      summary:        String(parsed.summary   || "").slice(0, 600),
      recommendation: String(parsed.recommendation || "").slice(0, 300),
      scamType:       parsed.scamType ?? null,
      additionalFlags: (parsed.additionalFlags ?? []).slice(0, 6).map((f) => ({
        title:       String(f.title || "").slice(0, 100),
        severity:    (["critical","high","medium","low"].includes(f.severity) ? f.severity : "medium") as AIFlag["severity"],
        description: String(f.description || "").slice(0, 400),
        confidence:  Math.max(0, Math.min(1, Number(f.confidence) || 0.7)),
      })),
    };
  } catch (err) {
    console.error("[AI analysis]", err);
    return null;
  }
}
