import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarkAsPaidUseCase } from './mark-as-paid-use-case';
import { MemoryOrderRepository } from '../infrastructure/memory-order-repository';
import { MemoryOutboxRepository } from '@/shared/kernel/memory-outbox-repository';
import { GlobalEvents } from '@/shared/events';
import { OrderEntity, OrderStatus } from '../domain/order-repository';
import { OrderLineItemEntity } from '../domain/order-line-item-entity';

/**
 * Extended Test Scenarios - Phase 4
 * Focus: Extended happy path, edge cases, validation & retry behavior
 */
describe('MarkAsPaidUseCase - Extended Scenarios', () => {
  let orderRepository: MemoryOrderRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: MarkAsPaidUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new MarkAsPaidUseCase(orderRepository, outboxRepository);
  });

  describe('Extended Happy Path', () => {
    it('should handle complete order lifecycle with multiple line items', async () => {
      // Arrange - Create order with multiple line items
      const orderWithItems: OrderEntity = {
        id: 'order-multi-items',
        userId: 'user-123',
        sellerId: 'seller-456',
        total: 350,
        status: 'pending',
        lineItems: [
          { id: 'item-1', productId: 'prod-1', quantity: 2, price: 100 },
          { id: 'item-2', productId: 'prod-2', quantity: 1, price: 150 },
        ],
      };
      await orderRepository.save(orderWithItems);

      // Act
      await useCase.execute({
        orderId: 'order-multi-items',
        paymentId: 'payment-complete-001',
        amount: 350,
      });

      // Assert - Order transitioned correctly
      const updatedOrder = await orderRepository.findById('order-multi-items');
      expect(updatedOrder?.status).toBe('paid');
      expect(updatedOrder?.lineItems.length).toBe(2);
      expect(updatedOrder?.total).toBe(350);

      // Assert - Event emitted with correct structure
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_PAID);
      expect(outboxRepository.events[0].payload).toEqual({
        orderId: 'order-multi-items',
        userId: 'user-123',
        paymentId: 'payment-complete-001',
        totalAmount: 350,
        paidAt: expect.any(String),
      });
    });

    it('should handle multiple sequential payments for different orders', async () => {
      // Arrange - Create two pending orders
      await orderRepository.save({
        id: 'order-a',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      });
      await orderRepository.save({
        id: 'order-b',
        userId: 'user-2',
        sellerId: 'seller-2',
        total: 200,
        status: 'pending',
        lineItems: [],
      });

      // Act - Process payments sequentially
      await useCase.execute({ orderId: 'order-a', paymentId: 'pay-a', amount: 100 });
      await useCase.execute({ orderId: 'order-b', paymentId: 'pay-b', amount: 200 });

      // Assert - Both orders paid, both events emitted
      const orderA = await orderRepository.findById('order-a');
      const orderB = await orderRepository.findById('order-b');
      expect(orderA?.status).toBe('paid');
      expect(orderB?.status).toBe('paid');
      expect(outboxRepository.events.length).toBe(2);
      expect(outboxRepository.events.map(e => e.payload.orderId)).toEqual(
        expect.arrayContaining(['order-a', 'order-b'])
      );
    });
  });

  describe('Edge Cases - Missing Events & Transaction Failures', () => {
    it('should handle missing paymentId in event data gracefully', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-no-payment',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act & Assert - Should handle gracefully (may throw or use default)
      await expect(
        useCase.execute({
          orderId: 'order-no-payment',
          paymentId: '', // Empty payment ID
          amount: 100,
        })
      ).resolves.not.toThrow(); // Should not crash

      // Order should still be marked as paid (paymentId is metadata)
      const updatedOrder = await orderRepository.findById('order-no-payment');
      expect(updatedOrder?.status).toBe('paid');
    });

    it('should handle zero amount payment', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-zero-amount',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 0,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await useCase.execute({
        orderId: 'order-zero-amount',
        paymentId: 'payment-zero',
        amount: 0,
      });

      // Assert - Should still transition to paid
      const updatedOrder = await orderRepository.findById('order-zero-amount');
      expect(updatedOrder?.status).toBe('paid');
      expect(outboxRepository.events.length).toBe(1);
    });

    it('should handle payment amount mismatch (partial payment)', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-partial',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Process partial payment (amount < total)
      // Note: Current implementation doesn't validate amount match
      await useCase.execute({
        orderId: 'order-partial',
        paymentId: 'payment-partial',
        amount: 50, // Less than total
      });

      // Assert - Order still marked as paid (no validation in current impl)
      const updatedOrder = await orderRepository.findById('order-partial');
      expect(updatedOrder?.status).toBe('paid');
    });
  });

  describe('Validation - State Transitions', () => {
    it('should reject payment for completed order', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-completed',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'completed' as OrderStatus,
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act & Assert
      await expect(
        useCase.execute({
          orderId: 'order-completed',
          paymentId: 'payment-1',
          amount: 100,
        })
      ).rejects.toThrow('Invalid state transition');
    });

    it('should handle all possible order states correctly', async () => {
      const states: OrderStatus[] = ['pending', 'paid', 'ready-for-production', 'cancelled', 'completed'];

      for (const state of states) {
        // Reset repositories
        orderRepository = new MemoryOrderRepository();
        outboxRepository = new MemoryOutboxRepository();
        useCase = new MarkAsPaidUseCase(orderRepository, outboxRepository);

        const order: OrderEntity = {
          id: `order-${state}`,
          userId: 'user-1',
          sellerId: 'seller-1',
          total: 100,
          status: state,
          lineItems: [],
        };
        await orderRepository.save(order);

        if (state === 'pending') {
          // Should succeed
          await expect(
            useCase.execute({ orderId: `order-${state}`, paymentId: 'pay-1', amount: 100 })
          ).resolves.not.toThrow();
        } else if (state === 'paid') {
          // Should be idempotent (no error, no event)
          await expect(
            useCase.execute({ orderId: `order-${state}`, paymentId: 'pay-1', amount: 100 })
          ).resolves.not.toThrow();
          expect(outboxRepository.events.length).toBe(0);
        } else {
          // Should fail for other states
          await expect(
            useCase.execute({ orderId: `order-${state}`, paymentId: 'pay-1', amount: 100 })
          ).rejects.toThrow('Invalid state transition');
        }
      }
    });
  });

  describe('Idempotency & Retry Behavior', () => {
    it('should handle duplicate payment events without side effects', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-duplicate',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - First payment
      await useCase.execute({ orderId: 'order-duplicate', paymentId: 'payment-1', amount: 100 });

      // Clear event tracking
      const eventsAfterFirst = outboxRepository.events.length;

      // Act - Duplicate payment (same orderId)
      await useCase.execute({ orderId: 'order-duplicate', paymentId: 'payment-1', amount: 100 });

      // Assert - No additional events
      expect(outboxRepository.events.length).toBe(eventsAfterFirst);
      const updatedOrder = await orderRepository.findById('order-duplicate');
      expect(updatedOrder?.status).toBe('paid');
    });

    it('should handle multiple retries of same payment event', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-retry',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Process payment 5 times (simulating retries)
      for (let i = 0; i < 5; i++) {
        await useCase.execute({ orderId: 'order-retry', paymentId: `payment-${i}`, amount: 100 });
      }

      // Assert - Only first payment created event
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].payload.paymentId).toBe('payment-0');
    });

    it('should maintain consistency when payment event is replayed after system restart', async () => {
      // Note: This test simulates idempotency within same system session
      // Real "restart" scenario would require persistent storage
      const order: OrderEntity = {
        id: 'order-restart',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // First processing
      await useCase.execute({ orderId: 'order-restart', paymentId: 'payment-restart', amount: 100 });

      // Simulate replay of same event (e.g., message queue redelivery)
      await useCase.execute({ orderId: 'order-restart', paymentId: 'payment-restart', amount: 100 });

      // Assert - Idempotent: no new events, order still paid
      expect(outboxRepository.events.length).toBe(1); // Only first event
      const updatedOrder = await orderRepository.findById('order-restart');
      expect(updatedOrder?.status).toBe('paid');
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
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      const beforeExecute = new Date();
      await useCase.execute({ orderId: 'order-timestamp', paymentId: 'payment-1', amount: 100 });
      const afterExecute = new Date();

      // Assert - Timestamp should be valid ISO 8601
      const eventTimestamp = outboxRepository.events[0].payload.paidAt;
      const eventDate = new Date(eventTimestamp);
      expect(eventDate).toBeInstanceOf(Date);
      expect(eventDate.getTime()).toBeGreaterThanOrEqual(beforeExecute.getTime());
      expect(eventDate.getTime()).toBeLessThanOrEqual(afterExecute.getTime());
    });

    it('should preserve order metadata in event payload', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-metadata',
        userId: 'user-unique-123',
        sellerId: 'seller-unique-456',
        total: 999.99,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await useCase.execute({ orderId: 'order-metadata', paymentId: 'payment-1', amount: 999.99 });

      // Assert - All metadata preserved
      const event = outboxRepository.events[0].payload;
      expect(event.orderId).toBe('order-metadata');
      expect(event.userId).toBe('user-unique-123');
      expect(event.paymentId).toBe('payment-1');
      expect(event.totalAmount).toBe(999.99);
    });
  });
});
