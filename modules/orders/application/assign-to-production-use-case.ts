import { OrderRepository } from '../domain/order-repository';
import { TransactionalOrderPort } from '../domain/transactional-order-port';
import { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/**
 * Data Transfer Object for assigning an order to production.
 * Contains the information needed to trigger production assignment
 * after product customizations are confirmed.
 */
export interface AssignToProductionDTO {
  /** Unique identifier of the order to assign to production */
  orderId: string;
  /** Unique identifier of the customization that triggered production readiness */
  customizationId: string;
}

/**
 * Use case for assigning a paid order to production.
 * 
 * This use case implements the state transition from 'paid' to 'ready-for-production' status.
 * It validates that the order exists, is in 'paid' status, and all prerequisites are met
 * before transitioning. The operation is idempotent - if the order is already in production,
 * it skips silently without emitting duplicate events.
 * 
 * State Transition: paid → ready-for-production
 * 
 * @example
 * ```typescript
 * const useCase = new AssignToProductionUseCase(orderRepo, outboxRepo, transactionalService);
 * await useCase.execute({ orderId: 'order-1', customizationId: 'custom-1' });
 * ```
 */
export class AssignToProductionUseCase {
  /**
   * Creates a new AssignToProductionUseCase instance.
   * 
   * @param orderRepository - Repository for order persistence operations
   * @param outboxRepository - Repository for emitting domain events via Outbox pattern
   * @param transactionalService - Optional service for atomic status update + event emission
   */
  constructor(
    private orderRepository: OrderRepository,
    private outboxRepository: OutboxRepository,
    private transactionalService?: TransactionalOrderPort,
  ) {}

  /**
   * Executes the assign-to-production operation for an order.
   * 
   * This method:
   * 1. Validates the order exists
   * 2. Checks idempotency (skips if already in production)
   * 3. Validates state transition (only from 'paid' status)
   * 4. Updates order status to 'ready-for-production'
   * 5. Emits ORDER_READY_FOR_PRODUCTION event via Outbox for production system
   * 
   * @param data - The customization data containing orderId and customizationId
   * @throws Error if order not found, order not paid, or invalid state transition
   * 
   * @example
   * ```typescript
   * await useCase.execute({
   *   orderId: 'order-123',
   *   customizationId: 'custom-456'
   * });
   * ```
   */
  async execute(data: AssignToProductionDTO): Promise<void> {
    // Find the order
    const order = await this.orderRepository.findById(data.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Idempotency: if already in production, skip silently
    if (order.status === 'ready-for-production') {
      return;
    }

    // Validate state transition (only paid orders can go to production)
    if (order.status !== 'paid') {
      if (order.status === 'pending') {
        throw new Error('Order must be paid before production');
      }
      throw new Error('Invalid state transition');
    }

    // Use transactional service if available for atomic updates
    if (this.transactionalService) {
      await this.transactionalService.updateStatusAndEmit(
        data.orderId,
        'ready-for-production',
        GlobalEvents.ORDER_READY_FOR_PRODUCTION,
        {
          orderId: order.id,
          userId: order.userId,
          sellerId: order.sellerId,
          customizationId: data.customizationId,
          readyAt: new Date().toISOString(),
        }
      );
    } else {
      // Fallback to non-transactional mode (for testing with MemoryOutboxRepository)
      // Update order status to ready-for-production
      await this.orderRepository.updateStatus(data.orderId, 'ready-for-production');

      // Emit ORDER_READY_FOR_PRODUCTION event via Outbox
      await this.outboxRepository.saveEvent(GlobalEvents.ORDER_READY_FOR_PRODUCTION, {
        orderId: order.id,
        userId: order.userId,
        sellerId: order.sellerId,
        customizationId: data.customizationId,
        readyAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Static method to subscribe to ProductCustomizationCreated events from the event bus.
   * 
   * This method registers a listener that automatically invokes the use case
   * when a ProductCustomizationCreated event is emitted by the product-customization module.
   * 
   * Error handling: If the use case execution fails, the error is logged
   * but not re-thrown to prevent breaking the event processing pipeline.
   * 
   * @param eventBus - The event bus instance to subscribe to
   * @param useCase - The use case instance to invoke on events
   * 
   * @example
   * ```typescript
   * const useCase = new AssignToProductionUseCase(orderRepo, outboxRepo);
   * AssignToProductionUseCase.subscribe(eventBus, useCase);
   * ```
   */
  static subscribe(eventBus: any, useCase: AssignToProductionUseCase): void {
    eventBus.on(GlobalEvents.PRODUCT_CUSTOMIZATION_CREATED, async (data: any) => {
      try {
        await useCase.execute(data);
      } catch (error) {
        console.error('Error processing ProductCustomizationCreated event:', error);
      }
    });
  }
}
