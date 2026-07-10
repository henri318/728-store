-- CreateEnum
CREATE TYPE "ProductImagePurpose" AS ENUM ('COVER', 'SHOWCASE', 'CUSTOMIZABLE_BASE');

-- AlterTable
ALTER TABLE "ProductImage"
ADD COLUMN "purpose" "ProductImagePurpose" NOT NULL DEFAULT 'CUSTOMIZABLE_BASE',
ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
ADD COLUMN "posterUrl" TEXT;

-- CreateIndex
CREATE INDEX "ProductImage_productId_purpose_position_idx" ON "ProductImage"("productId", "purpose", "position");

-- DropIndex
DROP INDEX "ProductImage_productId_position_idx";
