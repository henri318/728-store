/*
  Warnings:

  - You are about to drop the column `sellerId` on the `Customization` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Customization" DROP CONSTRAINT "Customization_productId_fkey";

-- DropForeignKey
ALTER TABLE "Customization" DROP CONSTRAINT "Customization_sellerId_fkey";

-- DropIndex
DROP INDEX "Customization_sellerId_idx";

-- AlterTable
ALTER TABLE "Customization" DROP COLUMN "sellerId";

-- AddForeignKey
ALTER TABLE "Customization" ADD CONSTRAINT "Customization_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
