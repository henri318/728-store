-- AlterTable: add cartId to Order for cart→order idempotency
--
-- Spec REQ-ORD-001: HandleCartCheckedOut subscribes to CART_CHECKED_OUT
-- and creates one Order per seller. A second delivery of the same event
-- MUST be a no-op — the handler dedupes by cartId via
-- OrderRepository.findIdsByCartId. The column is nullable because
-- orders can also be created outside the cart flow (manual orders).
ALTER TABLE "Order" ADD COLUMN "cartId" TEXT;

-- CreateIndex
-- The lookup is "all orders for a cart", so an index on cartId alone is
-- enough (it's a low-cardinality equality predicate). NULL values are
-- kept out of the index automatically by Postgres.
CREATE INDEX "Order_cartId_idx" ON "Order"("cartId");
