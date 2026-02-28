import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type AnthropicMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
      return NextResponse.json({ error: "Unsupported image type. Use JPG, PNG, or WebP." }, { status: 400 });
    }

    // Normalize "image/jpg" → "image/jpeg" for Anthropic SDK
    const mimeType: AnthropicMime = file.type === "image/jpg" ? "image/jpeg" : file.type as AnthropicMime;

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large. Max 5 MB." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type:       "base64",
                media_type: mimeType,
                data:       base64,
              },
            },
            {
              type: "text",
              text: `This is a screenshot of a marketplace listing (e.g. Facebook Marketplace, eBay, Mercari, Poshmark, Depop, or similar).

Extract the following fields from what is visible in the image and return ONLY valid JSON — no explanation, no markdown, just the JSON object:

{
  "title": "full product title",
  "price": 40.00,
  "description": "full description text visible in the screenshot",
  "sellerUsername": "seller name or username",
  "sellerReviewCount": 42,
  "sellerAvgRating": 4.8,
  "sellerIsVerified": false,
  "category": "Electronics"
}

Rules:
- price must be a plain number (no $ or commas), e.g. 40 or 129.99
- Use null for any field not visible in the image
- sellerAvgRating should be on a 0–5 scale; if you see stars convert accordingly
- sellerIsVerified is true only if you see a verification badge or "verified" label on the seller`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not extract listing data from image." }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]) as {
      title?: string | null;
      price?: number | null;
      description?: string | null;
      sellerUsername?: string | null;
      sellerReviewCount?: number | null;
      sellerAvgRating?: number | null;
      sellerIsVerified?: boolean | null;
      category?: string | null;
    };

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[POST /api/extract-from-screenshot]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
