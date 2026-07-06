-- AlterTable
ALTER TABLE "OrderLineItem" ADD COLUMN     "productImageUrl" TEXT,
ADD COLUMN     "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ProductTranslation_name_idx" ON "ProductTranslation"("name");
