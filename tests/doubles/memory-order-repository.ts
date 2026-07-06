import {
  OrderEntity,
  OrderRepository,
  OrderLineItemEntity,
  OrderStatus,
  OrderListFilter,
} from '@/modules/orders/domain/order-repository';
import { ORDER_PAID_PURCHASE_STATUSES } from '@/modules/orders/domain/value-objects/order-lifecycle';
import { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';

export class MemoryOrderRepository implements OrderRepository {
  private orders: OrderEntity[] = [];
  private orderLineItems: OrderLineItemEntity[] = [];

  async findPaginated(
    filter: OrderListFilter,
  ): Promise<PaginatedResult<OrderEntity>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const sortDir = filter.sortDir ?? 'desc';
    const status = filter.status ?? 'all';

    const filtered = this.orders.filter((order) => {
      if (filter.userId && order.userId !== filter.userId) return false;
      if (filter.sellerId && order.sellerId !== filter.sellerId) return false;
      if (status !== 'all' && order.status !== status) return false;
      return true;
    });

    const sorted = filtered.toSorted((a, b) => {
      const aTime = a.createdAt?.getTime?.() ?? 0;
      const bTime = b.createdAt?.getTime?.() ?? 0;
      const diff = aTime - bTime;
      return sortDir === 'asc' ? diff : -diff;
    });

    const total = sorted.length;
    const items = sorted.slice((page - 1) * pageSize, page * pageSize);
    return {
      items: items.map((order) => ({ ...order })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async save(order: OrderEntity, _tx?: unknown): Promise<OrderEntity> {
    this.orders.push(order);

    if (order.lineItems && order.lineItems.length > 0) {
      for (const lineItem of order.lineItems) {
        const lineItemWithOrderId: OrderLineItemEntity = {
          ...lineItem,
          orderId: order.id,
        };
        this.orderLineItems.push(lineItemWithOrderId);
      }
    }

    return order;
  }

  async saveOrderLineItems(
    orderId: string,
    lineItems: OrderLineItemEntity[],
    _tx?: unknown,
  ): Promise<void> {
    if (!lineItems || lineItems.length === 0) {
      return;
    }

    for (const item of lineItems) {
      this.orderLineItems.push({ ...item, orderId });
    }
  }

  async findById(orderId: string): Promise<OrderEntity | null> {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return null;

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

  async findIdsByCartId(cartId: string, _tx?: unknown): Promise<string[]> {
    return this.orders.filter((o) => o.cartId === cartId).map((o) => o.id);
  }

  async countPaidByUserId(userId: string): Promise<number> {
    return this.orders.filter(
      (o) =>
        o.userId === userId && ORDER_PAID_PURCHASE_STATUSES.includes(o.status),
    ).length;
  }

  async getLineItemsByOrderId(orderId: string): Promise<OrderLineItemEntity[]> {
    return this.orderLineItems.filter((item) => item.orderId === orderId);
  }

  async findAllForTest(): Promise<OrderEntity[]> {
    return this.orders.map((o) => ({ ...o }));
  }

  async getAllLineItemsForTest(): Promise<OrderLineItemEntity[]> {
    return [...this.orderLineItems];
  }
}
