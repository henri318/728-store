-- CreateTable
CREATE TABLE "CheckoutGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "latestPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutGroupPaymentAttempt" (
    "id" TEXT NOT NULL,
    "checkoutGroupId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutGroupPaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutGroupId" TEXT;

-- CreateIndex
CREATE INDEX "CheckoutGroup_userId_paymentStatus_idx" ON "CheckoutGroup"("userId", "paymentStatus");

-- CreateIndex
CREATE INDEX "CheckoutGroupPaymentAttempt_checkoutGroupId_createdAt_idx" ON "CheckoutGroupPaymentAttempt"("checkoutGroupId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_checkoutGroupId_idx" ON "Order"("checkoutGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutGroupId_sellerId_key" ON "Order"("checkoutGroupId", "sellerId");

-- AddForeignKey
ALTER TABLE "CheckoutGroup" ADD CONSTRAINT "CheckoutGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutGroupPaymentAttempt" ADD CONSTRAINT "CheckoutGroupPaymentAttempt_checkoutGroupId_fkey" FOREIGN KEY ("checkoutGroupId") REFERENCES "CheckoutGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutGroupId_fkey" FOREIGN KEY ("checkoutGroupId") REFERENCES "CheckoutGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
