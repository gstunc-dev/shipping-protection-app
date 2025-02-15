-- CreateTable
CREATE TABLE "ProtectionFee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "fee" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProtectionFee_shop_key" ON "ProtectionFee"("shop");
