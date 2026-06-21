import {
  OrderEntity,
  OrderRepository,
  OrderLineItemEntity,
  OrderStatus,
} from '@/modules/orders/domain/order-repository';

export class MemoryOrderRepository implements OrderRepository {
  private orders: OrderEntity[] = [];
  private orderLineItems: OrderLineItemEntity[] = []; // In-memory store for line items

  async save(order: OrderEntity): Promise<OrderEntity> {
    // Store the order
    this.orders.push(order);

    // Store associated order line items
    if (order.lineItems && order.lineItems.length > 0) {
      order.lineItems.forEach((lineItem) => {
        // Ensure orderId is set for line items before storing
        const lineItemWithOrderId: OrderLineItemEntity = {
          ...lineItem,
          orderId: order.id,
        };
        this.orderLineItems.push(lineItemWithOrderId);
      });
    }

    // Return the order entity with line items populated (as it was passed in)
    // In a real scenario, the repository might fetch them back to return a fully hydrated entity.
    // For this fake repository, returning the object as it was passed is sufficient.
    return order;
  }

  async saveOrderLineItems(
    orderId: string,
    lineItems: OrderLineItemEntity[],
  ): Promise<void> {
    if (!lineItems || lineItems.length === 0) {
      return;
    }

    lineItems.forEach((item) => {
      this.orderLineItems.push({ ...item, orderId });
    });
  }

  async findById(orderId: string): Promise<OrderEntity | null> {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return null;

    // Fetch associated line items to return a hydrated entity
    const lineItems = this.orderLineItems.filter(
      (item) => item.orderId === orderId,
    );
    return { ...order, lineItems };
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    this.orders[orderIndex] = {
      ...this.orders[orderIndex],
      status,
    };
  }

  // Add a method to retrieve line items if needed for testing or verification
  async getLineItemsByOrderId(orderId: string): Promise<OrderLineItemEntity[]> {
    return this.orderLineItems.filter((item) => item.orderId === orderId);
  }
}
