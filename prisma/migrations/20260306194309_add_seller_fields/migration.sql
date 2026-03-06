-- CreateTable
CREATE TABLE "ListingAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingUrl" TEXT,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "marketAvgPrice" REAL,
    "category" TEXT,
    "sellerUsername" TEXT,
    "sellerAccountAge" INTEGER,
    "sellerReviewCount" INTEGER,
    "sellerAvgRating" REAL,
    "sellerIsVerified" BOOLEAN NOT NULL DEFAULT false,
    "sellerProfileUrl" TEXT,
    "sellerLocation" TEXT,
    "sellerItemsSold" INTEGER,
    "imageUrls" TEXT,
    "trustScore" INTEGER NOT NULL,
    "trustTier" TEXT NOT NULL,
    "aiAnalysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RiskFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    CONSTRAINT "RiskFlag_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ListingAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingUrl" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
