import { Category } from "@/types";

// ─── Named product price references ───────────────────────────────────────────
// Each entry: [minAvg, maxAvg] in USD — midpoint is used as "market average"

interface PriceRange {
  min: number;
  max: number;
}

const PRODUCT_PRICES: { keywords: string[]; range: PriceRange }[] = [
  // Electronics
  { keywords: ["airpods pro"], range: { min: 150, max: 180 } },
  { keywords: ["airpods max"], range: { min: 280, max: 380 } },
  { keywords: ["airpods"], range: { min: 80, max: 120 } },
  { keywords: ["iphone 15 pro max"], range: { min: 750, max: 1000 } },
  { keywords: ["iphone 15 pro"], range: { min: 650, max: 850 } },
  { keywords: ["iphone 15"], range: { min: 500, max: 700 } },
  { keywords: ["iphone 14"], range: { min: 380, max: 550 } },
  { keywords: ["iphone 13"], range: { min: 280, max: 420 } },
  { keywords: ["ps5", "playstation 5"], range: { min: 350, max: 450 } },
  { keywords: ["xbox series x"], range: { min: 350, max: 450 } },
  { keywords: ["nintendo switch oled"], range: { min: 220, max: 300 } },
  { keywords: ["nintendo switch"], range: { min: 200, max: 280 } },
  { keywords: ["dyson v15"], range: { min: 400, max: 550 } },
  { keywords: ["dyson v12"], range: { min: 300, max: 420 } },
  { keywords: ["dyson v11"], range: { min: 250, max: 380 } },
  { keywords: ["dyson airwrap"], range: { min: 350, max: 480 } },
  { keywords: ["macbook pro 16"], range: { min: 1200, max: 1800 } },
  { keywords: ["macbook pro 14"], range: { min: 900, max: 1400 } },
  { keywords: ["macbook air"], range: { min: 700, max: 1100 } },
  { keywords: ["ipad pro"], range: { min: 600, max: 1000 } },
  { keywords: ["ipad air"], range: { min: 400, max: 600 } },
  { keywords: ["ipad"], range: { min: 200, max: 400 } },
  { keywords: ["canon powershot"], range: { min: 50, max: 120 } },
  { keywords: ["canon eos"], range: { min: 400, max: 900 } },
  { keywords: ["sony wh-1000xm5"], range: { min: 200, max: 300 } },
  { keywords: ["samsung galaxy s24"], range: { min: 450, max: 700 } },

  // Shoes / Sneakers
  { keywords: ["nike dunk low"], range: { min: 80, max: 140 } },
  { keywords: ["nike dunk high"], range: { min: 90, max: 160 } },
  { keywords: ["air jordan 1 retro high"], range: { min: 150, max: 300 } },
  { keywords: ["air jordan 1"], range: { min: 100, max: 220 } },
  { keywords: ["air jordan 4"], range: { min: 200, max: 400 } },
  { keywords: ["yeezy 350"], range: { min: 180, max: 320 } },
  { keywords: ["new balance 550"], range: { min: 80, max: 140 } },
  { keywords: ["converse chuck taylor"], range: { min: 40, max: 80 } },
  { keywords: ["ugg classic"], range: { min: 100, max: 160 } },
  { keywords: ["golden goose"], range: { min: 350, max: 550 } },

  // Handbags / Luxury
  { keywords: ["louis vuitton neverfull"], range: { min: 800, max: 1500 } },
  { keywords: ["louis vuitton speedy"], range: { min: 600, max: 1200 } },
  { keywords: ["louis vuitton"], range: { min: 400, max: 2000 } },
  { keywords: ["chanel classic flap"], range: { min: 5000, max: 9000 } },
  { keywords: ["chanel bag"], range: { min: 2000, max: 7000 } },
  { keywords: ["gucci soho"], range: { min: 700, max: 1200 } },
  { keywords: ["gucci"], range: { min: 400, max: 2000 } },
  { keywords: ["prada nylon"], range: { min: 500, max: 900 } },
  { keywords: ["coach"], range: { min: 80, max: 300 } },
  { keywords: ["kate spade"], range: { min: 80, max: 250 } },
  { keywords: ["michael kors"], range: { min: 60, max: 200 } },

  // Beauty
  { keywords: ["charlotte tilbury pillow talk"], range: { min: 30, max: 50 } },
  { keywords: ["nars foundation"], range: { min: 25, max: 45 } },
  { keywords: ["rare beauty"], range: { min: 18, max: 38 } },

  // Clothing
  { keywords: ["lululemon align"], range: { min: 60, max: 100 } },
  { keywords: ["lululemon"], range: { min: 40, max: 120 } },
  { keywords: ["canada goose"], range: { min: 400, max: 900 } },
  { keywords: ["supreme hoodie"], range: { min: 200, max: 450 } },
];

// ─── Category fallback averages ────────────────────────────────────────────────

const CATEGORY_AVERAGES: Record<Category, number> = {
  Electronics: 200,
  Clothing: 60,
  Shoes: 100,
  Handbags: 300,
  Beauty: 35,
  Home: 80,
  Toys: 40,
  Collectibles: 120,
  Other: 75,
};

// ─── Public API ────────────────────────────────────────────────────────────────

export function getMarketAvgPrice(
  title: string,
  category?: string | null
): number | null {
  const lower = title.toLowerCase();

  // Try specific product match first (order matters — more specific entries are earlier)
  for (const entry of PRODUCT_PRICES) {
    if (entry.keywords.every((kw) => lower.includes(kw))) {
      return (entry.range.min + entry.range.max) / 2;
    }
  }

  // Fall back to category average
  if (category && category in CATEGORY_AVERAGES) {
    return CATEGORY_AVERAGES[category as Category];
  }

  return null;
}

export function getDeviationPercent(
  listingPrice: number,
  marketAvg: number
): number {
  // Returns negative if listing is below market (e.g. -52 means 52% below)
  return ((listingPrice - marketAvg) / marketAvg) * 100;
}
