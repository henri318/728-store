import type { CustomizationSnapshot } from '../customization-lookup-port';

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
  /** Product name (enriched at query time) */
  productName?: string;
  /** Product image URL (snapshot at checkout time) */
  productImageUrl?: string | null;
  /** Unit price at checkout time */
  unitPrice: number;
  /** Quantity of this product */
  quantity: number;
  /** References to Customization entities (historical) */
  customizationIdList: string[];
  /** Immutable snapshot frozen at checkout time */
  customizationSnapshot: CustomizationSnapshot[] | null;
}
