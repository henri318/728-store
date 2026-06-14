import { OrderRepository } from '../domain/order-repository';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/shared/events';
import { TransactionalOrderService } from '../infrastructure/transactional-order-service';

/**
 * Data Transfer Object for marking an order as paid.
 * Contains the minimal information needed to process a payment completion event.
 */
export interface MarkAsPaidDTO {
  /** Unique identifier of the order to mark as paid */
  orderId: string;
  /** Unique identifier of the payment that completed */
  paymentId: string;
  /** Total amount paid for the order */
  amount: number;
}

/**
 * Use case for marking an order as paid when a PaymentCompleted event is received.
 * 
 * This use case implements the state transition from 'pending' to 'paid' status.
 * It validates that the order exists and is in the correct initial state before
 * performing the transition. The operation is idempotent - if the order is already
 * paid, it skips silently without emitting duplicate events.
 * 
 * State Transition: pending → paid
 * 
 * @example
 * ```typescript
 * const useCase = new MarkAsPaidUseCase(orderRepo, outboxRepo, transactionalService);
 * await useCase.execute({ orderId: 'order-1', paymentId: 'pay-1', amount: 100 });
 * ```
 */
export class MarkAsPaidUseCase {
  /**
   * Creates a new MarkAsPaidUseCase instance.
   * 
   * @param orderRepository - Repository for order persistence operations
   * @param outboxRepository - Repository for emitting domain events via Outbox pattern
   * @param transactionalService - Optional service for atomic status update + event emission
   */
  constructor(
    private orderRepository: OrderRepository,
    private outboxRepository: OutboxRepository,
    private transactionalService?: TransactionalOrderService,
  ) {}

  /**
   * Executes the mark-as-paid operation for an order.
   * 
   * This method:
   * 1. Validates the order exists
   * 2. Checks idempotency (skips if already paid)
   * 3. Validates state transition (only from 'pending')
   * 4. Updates order status to 'paid'
   * 5. Emits ORDER_PAID event via Outbox for downstream consumers
   * 
   * @param data - The payment completion data containing orderId, paymentId, and amount
   * @throws Error if order not found or invalid state transition
   * 
   * @example
   * ```typescript
   * await useCase.execute({
   *   orderId: 'order-123',
   *   paymentId: 'payment-456',
   *   amount: 99.99
   * });
   * ```
   */
  async execute(data: MarkAsPaidDTO): Promise<void> {
    // Find the order
    const order = await this.orderRepository.findById(data.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Idempotency: if already paid, skip silently
    if (order.status === 'paid') {
      return;
    }

    // Validate state transition (only pending orders can be marked as paid)
    if (order.status !== 'pending') {
      throw new Error('Invalid state transition');
    }

    // Use transactional service if available for atomic updates
    if (this.transactionalService) {
      await this.transactionalService.updateStatusAndEmit(
        data.orderId,
        'paid',
        GlobalEvents.ORDER_PAID,
        {
          orderId: order.id,
          userId: order.userId,
          paymentId: data.paymentId,
          totalAmount: order.total,
          paidAt: new Date().toISOString(),
        }
      );
    } else {
      // Fallback to non-transactional mode (for testing with MemoryOutboxRepository)
      // Update order status to paid
      await this.orderRepository.updateStatus(data.orderId, 'paid');

      // Emit ORDER_PAID event via Outbox
      await this.outboxRepository.saveEvent(GlobalEvents.ORDER_PAID, {
        orderId: order.id,
        userId: order.userId,
        paymentId: data.paymentId,
        totalAmount: order.total,
        paidAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Static method to subscribe to PaymentCompleted events from the event bus.
   * 
   * This method registers a listener that automatically invokes the use case
   * when a PaymentCompleted event is emitted by the payments module.
   * 
   * Error handling: If the use case execution fails, the error is logged
   * but not re-thrown to prevent breaking the event processing pipeline.
   * 
   * @param eventBus - The event bus instance to subscribe to
   * @param useCase - The use case instance to invoke on events
   * 
   * @example
   * ```typescript
   * const useCase = new MarkAsPaidUseCase(orderRepo, outboxRepo);
   * MarkAsPaidUseCase.subscribe(eventBus, useCase);
   * ```
   */
  static subscribe(eventBus: any, useCase: MarkAsPaidUseCase): void {
    eventBus.on(GlobalEvents.PAYMENT_COMPLETED, async (data: any) => {
      try {
        await useCase.execute(data);
      } catch (error) {
        console.error('Error processing PaymentCompleted event:', error);
      }
    });
  }
}
