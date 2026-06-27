/**
 * Represents a single line item within an order.
 * Contains product information and customization references + immutable snapshot.
 */
export interface OrderLineItemEntity {
  /** Unique identifier for the line item */
  id: string;
  /** Reference to the parent order */
  orderId: string;
  /** ID of the product being ordered */
  productId: string;
  /** Quantity of this product */
  quantity: number;
  /** References to Customization entities (historical) */
  customizationIdList: string[];
  /** Immutable snapshot frozen at checkout time */
  customizationSnapshot: {
    text?: string;
    color?: string;
    size?: string;
    imageUrl?: string;
  } | null;
}
