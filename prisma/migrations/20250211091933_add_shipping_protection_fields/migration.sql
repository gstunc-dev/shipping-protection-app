-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProtectionFee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "minOrder" TEXT NOT NULL DEFAULT '0',
    "enabled" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_ProtectionFee" ("fee", "id", "shop") SELECT "fee", "id", "shop" FROM "ProtectionFee";
DROP TABLE "ProtectionFee";
ALTER TABLE "new_ProtectionFee" RENAME TO "ProtectionFee";
CREATE UNIQUE INDEX "ProtectionFee_shop_key" ON "ProtectionFee"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
