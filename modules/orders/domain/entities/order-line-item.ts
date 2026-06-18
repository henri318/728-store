/**
 * Represents a single line item within an order.
 * Contains product information and customization options.
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
  /** Optional text customization for the product */
  customizationText?: string | null;
  /** Optional color customization for the product */
  customizationColor?: string | null;
  /** Optional size customization for the product */
  customizationSize?: string | null;
  /** Optional URL to customized product image */
  customizationImageUrl?: string | null;
}
