import type { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import type { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import type { Currency } from '@/shared/kernel/domain/value-objects/currency';

/**
 * ProductSnapshot — minimal product view that the cart module needs.
 *
 * The cart module never imports from the products module directly. The
 * composition root wires a `ProductRepository` adapter (same pattern as
 * orders) that resolves product ids into these snapshots at runtime.
 */
export interface ProductSnapshot {
  id: ProductId;
  basePrice: number;
  currency: Currency;
  sellerId: SellerId;
}
