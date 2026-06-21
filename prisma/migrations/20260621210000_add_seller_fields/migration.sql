-- AlterTable: Add seller fields
ALTER TABLE "Seller" ADD COLUMN "description" TEXT,
ADD COLUMN "userId" TEXT NOT NULL,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: Unique constraint on Seller.name
CREATE UNIQUE INDEX "Seller_name_key" ON "Seller"("name");

-- CreateIndex: Unique constraint on Seller.userId
CREATE UNIQUE INDEX "Seller_userId_key" ON "Seller"("userId");

-- CreateIndex: Index on Seller.status
CREATE INDEX "Seller_status_idx" ON "Seller"("status");

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
