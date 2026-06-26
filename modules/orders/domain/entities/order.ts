import type { OrderLineItemEntity } from './order-line-item';

/**
 * Represents an order aggregate root in the e-commerce system.
 * An order contains all information about a customer's purchase,
 * including user, seller, total amount, and current status.
 */
export interface OrderEntity {
  /** Unique identifier for the order */
  id: string;
  /** ID of the user who placed the order */
  userId: string;
  /** ID of the seller fulfilling the order */
  sellerId: string;
  /** Total monetary value of the order */
  total: number;
  /** Current status in the order lifecycle: pending → paid → ready-for-production → completed */
  status: string;
  /**
   * Source cart id when the order was created by HandleCartCheckedOut
   * (spec REQ-ORD-001). Present for cart-derived orders, used for
   * idempotency: the handler dedupes by cartId so duplicate CART_CHECKED_OUT
   * deliveries do not create a second set of orders. Null for orders
   * that were not created from a cart.
   */
  cartId?: string | null;
  /** Optional array of line items in the order */
  lineItems?: OrderLineItemEntity[];
}
