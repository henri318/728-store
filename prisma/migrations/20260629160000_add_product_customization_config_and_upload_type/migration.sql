-- AlterTable
ALTER TABLE "Product" ADD COLUMN "customizationConfig" JSONB;

-- AlterEnum
ALTER TYPE "UploadType" ADD VALUE IF NOT EXISTS 'customization';
