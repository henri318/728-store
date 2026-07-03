-- AlterTable
ALTER TABLE "Product" ADD COLUMN "customizationConfig" JSONB;

-- AlterEnum
ALTER TYPE "UploadType" ADD VALUE IF NOT EXISTS 'customization';

-- AlterTable
-- Add a nullable JSONB column to capture the buyer-side design position
-- produced by the mockup canvas. Existing rows (text-only or legacy
-- customizations) remain valid because the column is nullable.
ALTER TABLE "Customization" ADD COLUMN "designPosition" JSONB;
