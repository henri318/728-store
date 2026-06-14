import { OrderRepository } from '../domain/order-repository';
import { prisma } from '@/shared/infrastructure/prisma';

/**
 * Service to handle transactional operations that involve both
 * order status updates and event emission via outbox.
 * 
 * This ensures atomicity: either both operations succeed or both fail.
 */
export class TransactionalOrderService {
  constructor(
    private orderRepository: OrderRepository,
  ) {}

  /**
   * Execute a transactional operation that updates order status and emits events
   * @param orderId - The order ID to update
   * @param newStatus - The new status to set
   * @param eventType - The event type to emit
   * @param eventPayload - The event payload (excluding orderId which is added automatically)
   */
  async updateStatusAndEmit(
    orderId: string,
    newStatus: string,
    eventType: string,
    eventPayload: Record<string, any>
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update order status
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // Save event to outbox within same transaction
      await tx.outboxEvent.create({
        data: {
          eventType,
          payload: eventPayload,
          status: 'PENDING',
        },
      });
    });
  }
}
