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
  /** Optional array of line items in the order */
  lineItems?: OrderLineItemEntity[];
}

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

/**
 * Valid status values for an order in its lifecycle.
 * - pending: Order created, awaiting payment
 * - paid: Payment completed, awaiting production
 * - ready-for-production: All customizations confirmed, ready to manufacture
 * - completed: Order fulfilled and delivered
 * - cancelled: Order cancelled by user or system
 */
export type OrderStatus = 'pending' | 'paid' | 'ready-for-production' | 'completed' | 'cancelled';

/**
 * Repository interface for order persistence operations.
 * Follows the Repository pattern for data access abstraction.
 */
export interface OrderRepository {
  /**
   * Saves an order entity to the database.
   * @param order - The order entity to save
   * @returns The saved order entity
   */
  save(order: OrderEntity): Promise<OrderEntity>;
  
  /**
   * Saves line items associated with an order.
   * @param orderId - The ID of the parent order
   * @param lineItems - Array of line item entities to save
   */
  saveOrderLineItems(orderId: string, lineItems: OrderLineItemEntity[]): Promise<void>;
  
  /**
   * Finds an order by its unique identifier.
   * @param orderId - The unique ID of the order to find
   * @returns The order entity if found, null otherwise
   */
  findById(orderId: string): Promise<OrderEntity | null>;
  
  /**
   * Updates the status of an order.
   * Validates that the order exists before updating.
   * @param orderId - The ID of the order to update
   * @param status - The new status value
   * @throws Error if order not found
   */
  updateStatus(orderId: string, status: OrderStatus): Promise<void>;
}
