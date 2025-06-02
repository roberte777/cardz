-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "commanderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deck_commanderId_fkey" FOREIGN KEY ("commanderId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deck" ("createdAt", "description", "format", "id", "isPublic", "name", "updatedAt", "userId") SELECT "createdAt", "description", "format", "id", "isPublic", "name", "updatedAt", "userId" FROM "Deck";
DROP TABLE "Deck";
ALTER TABLE "new_Deck" RENAME TO "Deck";
CREATE INDEX "Deck_userId_idx" ON "Deck"("userId");
CREATE INDEX "Deck_format_idx" ON "Deck"("format");
CREATE INDEX "Deck_isPublic_idx" ON "Deck"("isPublic");
CREATE INDEX "Deck_createdAt_idx" ON "Deck"("createdAt");
CREATE INDEX "Deck_commanderId_idx" ON "Deck"("commanderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
