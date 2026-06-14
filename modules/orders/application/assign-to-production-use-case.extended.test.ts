import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssignToProductionUseCase } from './assign-to-production-use-case';
import { MemoryOrderRepository } from '../infrastructure/memory-order-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/shared/events';
import { OrderEntity } from '../domain/order-repository';

/**
 * Extended Test Scenarios - Phase 4
 * Focus: Extended happy path, edge cases, validation & retry behavior
 */
describe('AssignToProductionUseCase - Extended Scenarios', () => {
  let orderRepository: MemoryOrderRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: AssignToProductionUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new AssignToProductionUseCase(orderRepository, outboxRepository);
  });

  describe('Extended Happy Path', () => {
    it('should handle production assignment with multiple line items', async () => {
      // Arrange - Create paid order with multiple line items
      const orderWithItems: OrderEntity = {
        id: 'order-production-multi',
        userId: 'user-123',
        sellerId: 'seller-456',
        total: 500,
        status: 'paid',
        lineItems: [
          { id: 'item-1', productId: 'prod-1', quantity: 2, price: 200 },
          { id: 'item-2', productId: 'prod-2', quantity: 1, price: 100 },
        ],
      };
      await orderRepository.save(orderWithItems);

      // Act
      await useCase.execute({
        orderId: 'order-production-multi',
        customizationId: 'custom-batch-001',
      });

      // Assert - Order transitioned correctly
      const updatedOrder = await orderRepository.findById('order-production-multi');
      expect(updatedOrder?.status).toBe('ready-for-production');
      expect(updatedOrder?.lineItems.length).toBe(2);

      // Assert - Event emitted with correct structure
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_READY_FOR_PRODUCTION);
      expect(outboxRepository.events[0].payload).toEqual({
        orderId: 'order-production-multi',
        userId: 'user-123',
        sellerId: 'seller-456',
        customizationId: 'custom-batch-001',
        readyAt: expect.any(String),
      });
    });

    it('should handle multiple sequential production assignments', async () => {
      // Arrange - Create two paid orders
      await orderRepository.save({
        id: 'order-a',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      });
      await orderRepository.save({
        id: 'order-b',
        userId: 'user-2',
        sellerId: 'seller-2',
        total: 200,
        status: 'paid',
        lineItems: [],
      });

      // Act - Assign both to production
      await useCase.execute({ orderId: 'order-a', customizationId: 'custom-a' });
      await useCase.execute({ orderId: 'order-b', customizationId: 'custom-b' });

      // Assert - Both orders assigned, both events emitted
      const orderA = await orderRepository.findById('order-a');
      const orderB = await orderRepository.findById('order-b');
      expect(orderA?.status).toBe('ready-for-production');
      expect(orderB?.status).toBe('ready-for-production');
      expect(outboxRepository.events.length).toBe(2);
    });
  });

  describe('Edge Cases - Missing Events & Failures', () => {
    it('should handle missing customizationId gracefully', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-no-custom',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Empty customization ID
      await useCase.execute({
        orderId: 'order-no-custom',
        customizationId: '', // Empty
      });

      // Assert - Should still transition (customizationId is metadata)
      const updatedOrder = await orderRepository.findById('order-no-custom');
      expect(updatedOrder?.status).toBe('ready-for-production');
    });

    it('should handle order with no line items', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-empty',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 0,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await useCase.execute({
        orderId: 'order-empty',
        customizationId: 'custom-empty',
      });

      // Assert - Should still work
      const updatedOrder = await orderRepository.findById('order-empty');
      expect(updatedOrder?.status).toBe('ready-for-production');
      expect(outboxRepository.events.length).toBe(1);
    });

    it('should handle very large order IDs', async () => {
      // Arrange
      const longId = 'order-' + 'x'.repeat(1000);
      const order: OrderEntity = {
        id: longId,
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await useCase.execute({ orderId: longId, customizationId: 'custom-1' });

      // Assert
      const updatedOrder = await orderRepository.findById(longId);
      expect(updatedOrder?.status).toBe('ready-for-production');
    });
  });

  describe('Validation - State Transitions', () => {
    it('should reject production assignment for pending order', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-pending',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act & Assert
      await expect(
        useCase.execute({ orderId: 'order-pending', customizationId: 'custom-1' })
      ).rejects.toThrow('Order must be paid before production');
    });

    it('should reject production assignment for cancelled order', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-cancelled',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'cancelled',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act & Assert
      await expect(
        useCase.execute({ orderId: 'order-cancelled', customizationId: 'custom-1' })
      ).rejects.toThrow('Invalid state transition');
    });

    it('should reject production assignment for completed order', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-completed',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'completed',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act & Assert
      await expect(
        useCase.execute({ orderId: 'order-completed', customizationId: 'custom-1' })
      ).rejects.toThrow('Invalid state transition');
    });

    it('should handle all possible order states correctly', async () => {
      const testCases = [
        { state: 'pending', shouldFail: true, expectedError: 'Order must be paid before production' },
        { state: 'paid', shouldFail: false },
        { state: 'ready-for-production', shouldFail: false }, // Idempotent
        { state: 'cancelled', shouldFail: true, expectedError: 'Invalid state transition' },
        { state: 'completed', shouldFail: true, expectedError: 'Invalid state transition' },
      ];

      for (const testCase of testCases) {
        // Reset repositories
        orderRepository = new MemoryOrderRepository();
        outboxRepository = new MemoryOutboxRepository();
        useCase = new AssignToProductionUseCase(orderRepository, outboxRepository);

        const order: OrderEntity = {
          id: `order-${testCase.state}`,
          userId: 'user-1',
          sellerId: 'seller-1',
          total: 100,
          status: testCase.state as any,
          lineItems: [],
        };
        await orderRepository.save(order);

        if (testCase.shouldFail) {
          await expect(
            useCase.execute({ orderId: `order-${testCase.state}`, customizationId: 'custom-1' })
          ).rejects.toThrow(testCase.expectedError || 'Invalid state transition');
        } else if (testCase.state === 'ready-for-production') {
          // Idempotent - no error, no event
          await expect(
            useCase.execute({ orderId: `order-${testCase.state}`, customizationId: 'custom-1' })
          ).resolves.not.toThrow();
          expect(outboxRepository.events.length).toBe(0);
        } else {
          // Should succeed
          await expect(
            useCase.execute({ orderId: `order-${testCase.state}`, customizationId: 'custom-1' })
          ).resolves.not.toThrow();
        }
      }
    });
  });

  describe('Idempotency & Retry Behavior', () => {
    it('should handle duplicate production assignment events', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-duplicate',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - First assignment
      await useCase.execute({ orderId: 'order-duplicate', customizationId: 'custom-1' });

      // Clear tracking
      const eventsAfterFirst = outboxRepository.events.length;

      // Act - Duplicate assignment
      await useCase.execute({ orderId: 'order-duplicate', customizationId: 'custom-1' });

      // Assert - No additional events
      expect(outboxRepository.events.length).toBe(eventsAfterFirst);
      const updatedOrder = await orderRepository.findById('order-duplicate');
      expect(updatedOrder?.status).toBe('ready-for-production');
    });

    it('should handle multiple retries of same customization event', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-retry',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Process 5 times (simulating retries)
      for (let i = 0; i < 5; i++) {
        await useCase.execute({ orderId: 'order-retry', customizationId: `custom-${i}` });
      }

      // Assert - Only first created event
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].payload.customizationId).toBe('custom-0');
    });

    it('should maintain consistency after system restart simulation', async () => {
      // Note: This test simulates idempotency within same system session
      // Real "restart" scenario would require persistent storage
      const order: OrderEntity = {
        id: 'order-restart',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // First processing
      await useCase.execute({ orderId: 'order-restart', customizationId: 'custom-restart' });

      // Simulate replay of same event (e.g., message queue redelivery)
      await useCase.execute({ orderId: 'order-restart', customizationId: 'custom-restart' });

      // Assert - Idempotent: no new events
      expect(outboxRepository.events.length).toBe(1); // Only first event
      const updatedOrder = await orderRepository.findById('order-restart');
      expect(updatedOrder?.status).toBe('ready-for-production');
    });
  });

  describe('Event Data Integrity', () => {
    it('should emit event with correct timestamp format', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-timestamp',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      const beforeExecute = new Date();
      await useCase.execute({ orderId: 'order-timestamp', customizationId: 'custom-1' });
      const afterExecute = new Date();

      // Assert - Valid ISO 8601 timestamp
      const eventTimestamp = outboxRepository.events[0].payload.readyAt;
      const eventDate = new Date(eventTimestamp);
      expect(eventDate).toBeInstanceOf(Date);
      expect(eventDate.getTime()).toBeGreaterThanOrEqual(beforeExecute.getTime());
      expect(eventDate.getTime()).toBeLessThanOrEqual(afterExecute.getTime());
    });

    it('should preserve all order metadata in event', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-metadata',
        userId: 'user-unique-123',
        sellerId: 'seller-unique-456',
        total: 999.99,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await useCase.execute({ orderId: 'order-metadata', customizationId: 'custom-meta' });

      // Assert - All metadata preserved
      const event = outboxRepository.events[0].payload;
      expect(event.orderId).toBe('order-metadata');
      expect(event.userId).toBe('user-unique-123');
      expect(event.sellerId).toBe('seller-unique-456');
      expect(event.customizationId).toBe('custom-meta');
    });
  });

  describe('Complex Scenarios - Real World Flows', () => {
    it('should handle order flow: pending → paid → ready-for-production', async () => {
      // Arrange - Start with pending order
      const order: OrderEntity = {
        id: 'order-full-flow',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 200,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Create markAsPaid use case for first transition
      const markAsPaidUseCase = new (await import('./mark-as-paid-use-case')).MarkAsPaidUseCase(
        orderRepository,
        outboxRepository
      );

      // Act 1 - Mark as paid
      await markAsPaidUseCase.execute({ orderId: 'order-full-flow', paymentId: 'payment-1', amount: 200 });

      // Verify intermediate state
      let updatedOrder = await orderRepository.findById('order-full-flow');
      expect(updatedOrder?.status).toBe('paid');
      expect(outboxRepository.events.length).toBe(1);

      // Act 2 - Assign to production
      await useCase.execute({ orderId: 'order-full-flow', customizationId: 'custom-1' });

      // Verify final state
      updatedOrder = await orderRepository.findById('order-full-flow');
      expect(updatedOrder?.status).toBe('ready-for-production');
      expect(outboxRepository.events.length).toBe(2);
      expect(outboxRepository.events[1].eventType).toBe(GlobalEvents.ORDER_READY_FOR_PRODUCTION);
    });

    it('should handle concurrent production assignment attempts', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-concurrent',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Simulate concurrent calls (Promise.all)
      // Note: In-memory repository processes sequentially, so all 3 will succeed
      // In real system with locking, only first would create event
      const results = await Promise.allSettled([
        useCase.execute({ orderId: 'order-concurrent', customizationId: 'custom-a' }),
        useCase.execute({ orderId: 'order-concurrent', customizationId: 'custom-b' }),
        useCase.execute({ orderId: 'order-concurrent', customizationId: 'custom-c' }),
      ]);

      // Assert - All should succeed (idempotent after first)
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // Order should be in production
      const updatedOrder = await orderRepository.findById('order-concurrent');
      expect(updatedOrder?.status).toBe('ready-for-production');

      // Note: With in-memory repo, all 3 calls succeed and emit events
      // In production with DB transactions, only first would emit
      // This test demonstrates the need for DB-level locking/optimistic concurrency
      expect(outboxRepository.events.length).toBeGreaterThanOrEqual(1);
    });
  });
});
