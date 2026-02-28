// One-time script to create tables in Turso.
// Run with:
//   node scripts/setup-turso.mjs
// Env vars must be set first (or put in a .env.local and load manually).

import { createClient } from "@libsql/client";

const url       = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const db = createClient({ url, authToken });

const statements = [
  `CREATE TABLE IF NOT EXISTS "ListingAnalysis" (
    "id"                TEXT    NOT NULL PRIMARY KEY,
    "listingUrl"        TEXT,
    "platform"          TEXT    NOT NULL,
    "title"             TEXT    NOT NULL,
    "description"       TEXT    NOT NULL,
    "price"             REAL    NOT NULL,
    "marketAvgPrice"    REAL,
    "category"          TEXT,
    "sellerUsername"    TEXT,
    "sellerAccountAge"  INTEGER,
    "sellerReviewCount" INTEGER,
    "sellerAvgRating"   REAL,
    "sellerIsVerified"  INTEGER NOT NULL DEFAULT 0,
    "imageUrls"         TEXT,
    "trustScore"        INTEGER NOT NULL,
    "trustTier"         TEXT    NOT NULL,
    "createdAt"         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "RiskFlag" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "analysisId"  TEXT NOT NULL,
    "flagType"    TEXT NOT NULL,
    "severity"    TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence"  REAL NOT NULL,
    FOREIGN KEY ("analysisId") REFERENCES "ListingAnalysis"("id") ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "UserReport" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "listingUrl"  TEXT NOT NULL,
    "platform"    TEXT NOT NULL,
    "reportType"  TEXT NOT NULL,
    "details"     TEXT,
    "createdAt"   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Index to speed up common dashboard queries
  `CREATE INDEX IF NOT EXISTS "ListingAnalysis_platform_idx" ON "ListingAnalysis"("platform")`,
  `CREATE INDEX IF NOT EXISTS "ListingAnalysis_trustTier_idx" ON "ListingAnalysis"("trustTier")`,
  `CREATE INDEX IF NOT EXISTS "RiskFlag_analysisId_idx"       ON "RiskFlag"("analysisId")`,
  `CREATE INDEX IF NOT EXISTS "RiskFlag_flagType_idx"         ON "RiskFlag"("flagType")`,
];

console.log("Connecting to Turso...");

for (const sql of statements) {
  const label = sql.trim().split("\n")[0].slice(0, 60);
  try {
    await db.execute(sql);
    console.log(`  ✓ ${label}`);
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(err.message);
    process.exit(1);
  }
}

console.log("\nDone — Turso database is ready.");
db.close();
