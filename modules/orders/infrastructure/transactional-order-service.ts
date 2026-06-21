import type { OrderRepository } from '../domain/order-repository';
import type { TransactionalOrderPort } from '../domain/transactional-order-port';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { prisma } from '@/shared/infrastructure/prisma';

/**
 * Service to handle transactional operations that involve both
 * order status updates and event emission via outbox.
 *
 * Implements `TransactionalOrderPort` so use cases can depend on the
 * domain port rather than this concrete class.
 *
 * Atomicity guarantee:
 *  - Order status update + outbox event happen inside the same
 *    `prisma.$transaction` block.
 *  - The outbox event is written through the OutboxRepository port,
 *    receiving the Prisma transaction client as the 3rd argument.
 *    This keeps the port surface clean (the `tx` is an
 *    infrastructure concern that the Prisma adapter handles).
 *
 * The pre-flight existence check uses the OrderRepository port, so the
 * service is fully testable with a memory double.
 */
export class TransactionalOrderService implements TransactionalOrderPort {
  constructor(
    private orderRepository: OrderRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  /**
   * Atomically:
   *  1. Pre-flight check: look up the order via the port
   *  2. Update the order status inside a Prisma transaction
   *  3. Record the outbox event in the same transaction (via the port
   *     with the tx client as 3rd arg)
   *
   * If the pre-flight check fails OR the update throws, the transaction
   * aborts and no side effects are persisted.
   */
  async updateStatusAndEmit(
    orderId: string,
    newStatus: string,
    eventType: string,
    eventPayload: Record<string, unknown>,
  ): Promise<void> {
    // Pre-flight: use the port to verify the order exists
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    await prisma.$transaction(async (tx) => {
      // Update via Prisma (tx-scoped) so it joins the same transaction.
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // Save event to outbox within the same transaction.
      // Pass the tx client so the Prisma adapter writes through it.
      await this.outboxRepository.saveEvent(eventType, eventPayload, tx);
    });
  }
}
