import type { OrderEntity } from './entities/order';
import type { OrderLineItemEntity } from './entities/order-line-item';
import type { OrderStatus } from './value-objects/order-status-type';

export type { OrderEntity, OrderLineItemEntity, OrderStatus };

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
