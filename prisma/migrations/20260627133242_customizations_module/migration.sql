/*
  Warnings:

  - You are about to drop the column `customizationColor` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationImageUrl` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationSize` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationText` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationColor` on the `OrderLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationImageUrl` on the `OrderLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationSize` on the `OrderLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationText` on the `OrderLineItem` table. All the data in the column will be lost.
  - You are about to drop the `ProductCustomization` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductCustomization" DROP CONSTRAINT "ProductCustomization_productId_fkey";

-- DropIndex
DROP INDEX "Category_slug_idx";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "customizationColor",
DROP COLUMN "customizationImageUrl",
DROP COLUMN "customizationSize",
DROP COLUMN "customizationText",
ADD COLUMN     "customizationIdList" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "OrderLineItem" DROP COLUMN "customizationColor",
DROP COLUMN "customizationImageUrl",
DROP COLUMN "customizationSize",
DROP COLUMN "customizationText",
ADD COLUMN     "customizationIdList" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "customizationSnapshot" JSONB;

-- DropTable
DROP TABLE "ProductCustomization";

-- CreateTable
CREATE TABLE "Customization" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "text" TEXT,
    "color" TEXT,
    "size" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customization_sellerId_idx" ON "Customization"("sellerId");

-- CreateIndex
CREATE INDEX "Customization_productId_idx" ON "Customization"("productId");

-- AddForeignKey
ALTER TABLE "Customization" ADD CONSTRAINT "Customization_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customization" ADD CONSTRAINT "Customization_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
