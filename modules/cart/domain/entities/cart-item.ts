import type { Money } from '@/shared/kernel/domain/value-objects/money';
import type { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import type { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

/**
 * Single line item inside a Cart.
 *
 * Each unique customization variant is a separate row (spec REQ-CART-002).
 * The same product+size+color+text+image merges into the existing row by
 * incrementing quantity.
 */
export interface CartItemEntity {
  /** Unique identifier */
  id: string;
  /** FK to the parent Cart */
  cartId: string;
  /** FK to the Product */
  productId: ProductId;
  /** Seller FK snapshotted at add time (preserved across product edits) */
  sellerId: SellerId;
  /** Units — must be 1..99 (validated via Quantity VO in use cases) */
  quantity: number;
  /** Price at the time the item was added (EUR) */
  unitPriceSnapshot: Money;
  /** References to Customization entities (resolved at checkout) */
  customizationIdList: string[];
}
