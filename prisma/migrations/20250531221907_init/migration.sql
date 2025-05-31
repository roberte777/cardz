-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oracleId" TEXT,
    "mtgoId" INTEGER,
    "tcgplayerId" INTEGER,
    "cardmarketId" INTEGER,
    "name" TEXT NOT NULL,
    "printedName" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "layout" TEXT NOT NULL,
    "manaCost" TEXT,
    "cmc" REAL NOT NULL DEFAULT 0,
    "typeLine" TEXT NOT NULL,
    "oracleText" TEXT,
    "printedText" TEXT,
    "flavorText" TEXT,
    "power" TEXT,
    "toughness" TEXT,
    "loyalty" TEXT,
    "setCode" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "collectorNumber" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "imageUris" TEXT,
    "cardFaces" TEXT,
    "colors" TEXT,
    "colorIdentity" TEXT,
    "colorIndicator" TEXT,
    "legalities" TEXT,
    "reserved" BOOLEAN NOT NULL DEFAULT false,
    "foil" BOOLEAN NOT NULL DEFAULT false,
    "nonfoil" BOOLEAN NOT NULL DEFAULT true,
    "oversized" BOOLEAN NOT NULL DEFAULT false,
    "promo" BOOLEAN NOT NULL DEFAULT false,
    "reprint" BOOLEAN NOT NULL DEFAULT false,
    "variation" BOOLEAN NOT NULL DEFAULT false,
    "frame" TEXT,
    "frameEffects" TEXT,
    "borderColor" TEXT,
    "prices" TEXT,
    "arenaId" INTEGER,
    "scryfallUri" TEXT,
    "uri" TEXT,
    "keywords" TEXT,
    "producedMana" TEXT,
    "watermark" TEXT,
    "artist" TEXT,
    "artistId" TEXT,
    "illustrationId" TEXT,
    "handModifier" TEXT,
    "lifeModifier" TEXT,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "mtgoCode" TEXT,
    "tcgplayerId" INTEGER,
    "name" TEXT NOT NULL,
    "uri" TEXT,
    "scryfallUri" TEXT,
    "searchUri" TEXT,
    "releasedAt" DATETIME,
    "setType" TEXT NOT NULL,
    "cardCount" INTEGER NOT NULL DEFAULT 0,
    "digital" BOOLEAN NOT NULL DEFAULT false,
    "foilOnly" BOOLEAN NOT NULL DEFAULT false,
    "nonfoilOnly" BOOLEAN NOT NULL DEFAULT false,
    "iconSvgUri" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ruling" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oracleId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "Card"("name");

-- CreateIndex
CREATE INDEX "Card_setCode_idx" ON "Card"("setCode");

-- CreateIndex
CREATE INDEX "Card_oracleId_idx" ON "Card"("oracleId");

-- CreateIndex
CREATE INDEX "Card_typeLine_idx" ON "Card"("typeLine");

-- CreateIndex
CREATE INDEX "Card_colors_idx" ON "Card"("colors");

-- CreateIndex
CREATE INDEX "Card_cmc_idx" ON "Card"("cmc");

-- CreateIndex
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");

-- CreateIndex
CREATE INDEX "Card_createdAt_idx" ON "Card"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Set_code_key" ON "Set"("code");

-- CreateIndex
CREATE INDEX "Set_code_idx" ON "Set"("code");

-- CreateIndex
CREATE INDEX "Set_releasedAt_idx" ON "Set"("releasedAt");

-- CreateIndex
CREATE INDEX "Set_setType_idx" ON "Set"("setType");

-- CreateIndex
CREATE INDEX "Ruling_oracleId_idx" ON "Ruling"("oracleId");

-- CreateIndex
CREATE INDEX "Ruling_publishedAt_idx" ON "Ruling"("publishedAt");
