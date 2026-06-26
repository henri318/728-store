import type { Money } from '@/shared/kernel/domain/value-objects/money';

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
  productId: string;
  /** Seller FK snapshotted at add time (preserved across product edits) */
  sellerId: string;
  /** Units — must be 1..99 (validated via Quantity VO in use cases) */
  quantity: number;
  /** Price at the time the item was added (EUR) */
  unitPriceSnapshot: Money;
  /** Optional inline text customization (max 500 chars) */
  customizationText?: string | null;
  /** Optional color customization (max 50 chars) */
  customizationColor?: string | null;
  /** Optional size customization (max 50 chars) */
  customizationSize?: string | null;
  /** Optional image URL (https only) */
  customizationImageUrl?: string | null;
}
