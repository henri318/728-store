-- Ensure idempotency is per cart + seller, not cart globally.
-- PostgreSQL unique indexes allow multiple NULL cartId values, so
-- manual/non-cart orders keep working as before.
CREATE UNIQUE INDEX "Order_cartId_sellerId_key" ON "Order"("cartId", "sellerId");
