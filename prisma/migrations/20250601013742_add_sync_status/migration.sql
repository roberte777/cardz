-- CreateTable
CREATE TABLE "sync_status" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "lastCardsSync" DATETIME,
    "lastRulingsSync" DATETIME,
    "lastSetsSync" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
