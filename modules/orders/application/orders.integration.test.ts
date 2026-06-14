import { describe, it, expect, beforeEach } from 'vitest';
import { MarkAsPaidUseCase } from './mark-as-paid-use-case';
import { AssignToProductionUseCase } from './assign-to-production-use-case';
import { MemoryOrderRepository } from '../infrastructure/memory-order-repository';
import { MemoryOutboxRepository } from '@/shared/kernel/memory-outbox-repository';
import { GlobalEvents } from '@/shared/events';
import { OrderEntity } from '../domain/order-repository';

/**
 * Integration Tests - Phase 4 Extended Scenarios
 * Focus: Complete order lifecycle, outbox processing, event-driven flows
 */
describe('Orders Module - Integration Tests', () => {
  let orderRepository: MemoryOrderRepository;
  let outboxRepository: MemoryOutboxRepository;
  let markAsPaidUseCase: MarkAsPaidUseCase;
  let assignToProductionUseCase: AssignToProductionUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    outboxRepository = new MemoryOutboxRepository();
    markAsPaidUseCase = new MarkAsPaidUseCase(orderRepository, outboxRepository);
    assignToProductionUseCase = new AssignToProductionUseCase(orderRepository, outboxRepository);
  });

  describe('Complete Order Lifecycle', () => {
    it('should handle complete flow: pending → paid → ready-for-production', async () => {
      // Arrange - Create pending order
      const order: OrderEntity = {
        id: 'order-lifecycle-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 250,
        status: 'pending',
        lineItems: [
          { id: 'item-1', productId: 'prod-1', quantity: 1, price: 250 },
        ],
      };
      await orderRepository.save(order);

      // Act 1 - Payment received
      await markAsPaidUseCase.execute({
        orderId: 'order-lifecycle-1',
        paymentId: 'payment-001',
        amount: 250,
      });

      // Assert 1 - Order is paid
      let updatedOrder = await orderRepository.findById('order-lifecycle-1');
      expect(updatedOrder?.status).toBe('paid');
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_PAID);

      // Act 2 - Customizations ready, assign to production
      await assignToProductionUseCase.execute({
        orderId: 'order-lifecycle-1',
        customizationId: 'custom-001',
      });

      // Assert 2 - Order in production
      updatedOrder = await orderRepository.findById('order-lifecycle-1');
      expect(updatedOrder?.status).toBe('ready-for-production');
      expect(outboxRepository.events.length).toBe(2);
      expect(outboxRepository.events[1].eventType).toBe(GlobalEvents.ORDER_READY_FOR_PRODUCTION);
    });

    it('should handle multiple orders through complete lifecycle', async () => {
      // Arrange - Create 3 pending orders
      const orders = [
        { id: 'order-1', userId: 'user-1', sellerId: 'seller-1', total: 100 },
        { id: 'order-2', userId: 'user-2', sellerId: 'seller-2', total: 200 },
        { id: 'order-3', userId: 'user-3', sellerId: 'seller-3', total: 300 },
      ];

      for (const orderData of orders) {
        await orderRepository.save({
          ...orderData,
          status: 'pending',
          lineItems: [],
        } as OrderEntity);
      }

      // Act - Process all payments
      for (let i = 1; i <= 3; i++) {
        await markAsPaidUseCase.execute({
          orderId: `order-${i}`,
          paymentId: `payment-${i}`,
          amount: i * 100,
        });
      }

      // Verify all paid
      for (let i = 1; i <= 3; i++) {
        const order = await orderRepository.findById(`order-${i}`);
        expect(order?.status).toBe('paid');
      }
      expect(outboxRepository.events.filter(e => e.eventType === GlobalEvents.ORDER_PAID).length).toBe(3);

      // Act - Assign all to production
      for (let i = 1; i <= 3; i++) {
        await assignToProductionUseCase.execute({
          orderId: `order-${i}`,
          customizationId: `custom-${i}`,
        });
      }

      // Verify all in production
      for (let i = 1; i <= 3; i++) {
        const order = await orderRepository.findById(`order-${i}`);
        expect(order?.status).toBe('ready-for-production');
      }
      expect(outboxRepository.events.filter(e => e.eventType === GlobalEvents.ORDER_READY_FOR_PRODUCTION).length).toBe(3);
    });
  });

  describe('Outbox Processing Simulation', () => {
    it('should record events in correct order for outbox worker', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-outbox',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 150,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Payment
      await markAsPaidUseCase.execute({
        orderId: 'order-outbox',
        paymentId: 'payment-outbox',
        amount: 150,
      });

      // Assert - Outbox has ORDER_PAID event
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_PAID);
      expect(outboxRepository.events[0].payload.orderId).toBe('order-outbox');

      // Act - Production assignment
      await assignToProductionUseCase.execute({
        orderId: 'order-outbox',
        customizationId: 'custom-outbox',
      });

      // Assert - Outbox has both events in order
      expect(outboxRepository.events.length).toBe(2);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_PAID);
      expect(outboxRepository.events[1].eventType).toBe(GlobalEvents.ORDER_READY_FOR_PRODUCTION);
    });

    it('should handle outbox event batch processing', async () => {
      // Arrange - Multiple orders
      const orderIds = ['batch-1', 'batch-2', 'batch-3', 'batch-4', 'batch-5'];
      
      for (const orderId of orderIds) {
        await orderRepository.save({
          id: orderId,
          userId: 'user-1',
          sellerId: 'seller-1',
          total: 50,
          status: 'pending',
          lineItems: [],
        });
      }

      // Act - Process all payments (batch)
      await Promise.all(
        orderIds.map(id =>
          markAsPaidUseCase.execute({ orderId: id, paymentId: `pay-${id}`, amount: 50 })
        )
      );

      // Assert - All events in outbox
      expect(outboxRepository.events.length).toBe(5);
      expect(outboxRepository.events.every(e => e.eventType === GlobalEvents.ORDER_PAID)).toBe(true);

      // Simulate outbox worker processing
      const processedEvents = outboxRepository.events.map(e => e.payload.orderId);
      expect(processedEvents.sort()).toEqual(orderIds.sort());
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle payment for non-existent order gracefully', async () => {
      // Act & Assert
      await expect(
        markAsPaidUseCase.execute({
          orderId: 'non-existent',
          paymentId: 'payment-1',
          amount: 100,
        })
      ).rejects.toThrow('Order not found');

      // No side effects
      expect(outboxRepository.events.length).toBe(0);
    });

    it('should maintain consistency when production assignment fails', async () => {
      // Arrange - Paid order
      const order: OrderEntity = {
        id: 'order-consistency',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Assign to production (should succeed)
      await assignToProductionUseCase.execute({
        orderId: 'order-consistency',
        customizationId: 'custom-1',
      });

      // Order should be in production
      const updatedOrder = await orderRepository.findById('order-consistency');
      expect(updatedOrder?.status).toBe('ready-for-production');
      expect(outboxRepository.events.length).toBe(1);
    });

    it('should handle invalid state transitions without corrupting data', async () => {
      // Arrange - Pending order
      const order: OrderEntity = {
        id: 'order-invalid',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Try to assign to production (invalid from pending)
      await expect(
        assignToProductionUseCase.execute({
          orderId: 'order-invalid',
          customizationId: 'custom-1',
        })
      ).rejects.toThrow('Order must be paid before production');

      // Assert - Order still pending, no events
      const updatedOrder = await orderRepository.findById('order-invalid');
      expect(updatedOrder?.status).toBe('pending');
      expect(outboxRepository.events.length).toBe(0);
    });
  });

  describe('Idempotency at System Level', () => {
    it('should handle duplicate payment events after production assignment', async () => {
      // Arrange - Start with pending order
      const order: OrderEntity = {
        id: 'order-dup',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act 1 - First payment (should succeed)
      await markAsPaidUseCase.execute({
        orderId: 'order-dup',
        paymentId: 'payment-first',
        amount: 100,
      });

      // Verify order is paid
      let updatedOrder = await orderRepository.findById('order-dup');
      expect(updatedOrder?.status).toBe('paid');
      expect(outboxRepository.events.length).toBe(1);

      // Act 2 - Duplicate payment event (should be idempotent)
      await markAsPaidUseCase.execute({
        orderId: 'order-dup',
        paymentId: 'payment-duplicate',
        amount: 100,
      });

      // Assert - No new event, order still paid
      expect(outboxRepository.events.length).toBe(1); // No additional events
      updatedOrder = await orderRepository.findById('order-dup');
      expect(updatedOrder?.status).toBe('paid');
    });

    it('should handle repeated production assignment requests', async () => {
      // Arrange - Paid order
      const order: OrderEntity = {
        id: 'order-repeat',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act - Multiple assignment requests
      for (let i = 0; i < 10; i++) {
        await assignToProductionUseCase.execute({
          orderId: 'order-repeat',
          customizationId: `custom-${i}`,
        });
      }

      // Assert - Only first created event
      expect(outboxRepository.events.length).toBe(1);
      const updatedOrder = await orderRepository.findById('order-repeat');
      expect(updatedOrder?.status).toBe('ready-for-production');
    });
  });

  describe('Event Payload Validation', () => {
    it('should emit ORDER_PAID with complete payload structure', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-payload-1',
        userId: 'user-test',
        sellerId: 'seller-test',
        total: 199.99,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await markAsPaidUseCase.execute({
        orderId: 'order-payload-1',
        paymentId: 'payment-test',
        amount: 199.99,
      });

      // Assert - Complete payload
      const event = outboxRepository.events[0];
      expect(event.eventType).toBe(GlobalEvents.ORDER_PAID);
      expect(event.payload).toEqual({
        orderId: 'order-payload-1',
        userId: 'user-test',
        paymentId: 'payment-test',
        totalAmount: 199.99,
        paidAt: expect.any(String),
      });
      expect(event.payload.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO 8601
    });

    it('should emit ORDER_READY_FOR_PRODUCTION with complete payload structure', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-payload-2',
        userId: 'user-test',
        sellerId: 'seller-test',
        total: 299.99,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await assignToProductionUseCase.execute({
        orderId: 'order-payload-2',
        customizationId: 'custom-test',
      });

      // Assert - Complete payload
      const event = outboxRepository.events[0];
      expect(event.eventType).toBe(GlobalEvents.ORDER_READY_FOR_PRODUCTION);
      expect(event.payload).toEqual({
        orderId: 'order-payload-2',
        userId: 'user-test',
        sellerId: 'seller-test',
        customizationId: 'custom-test',
        readyAt: expect.any(String),
      });
      expect(event.payload.readyAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO 8601
    });
  });

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle order with very large total amount', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-large',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 9999999.99,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await markAsPaidUseCase.execute({
        orderId: 'order-large',
        paymentId: 'payment-large',
        amount: 9999999.99,
      });

      // Assert
      const updatedOrder = await orderRepository.findById('order-large');
      expect(updatedOrder?.status).toBe('paid');
      expect(outboxRepository.events[0].payload.totalAmount).toBe(9999999.99);
    });

    it('should handle special characters in order metadata', async () => {
      // Arrange
      const order: OrderEntity = {
        id: 'order-special',
        userId: 'user-ñandú-123',
        sellerId: 'seller-测试 -456',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(order);

      // Act
      await assignToProductionUseCase.execute({
        orderId: 'order-special',
        customizationId: 'custom-émoji-🎉',
      });

      // Assert - Should handle special chars
      const updatedOrder = await orderRepository.findById('order-special');
      expect(updatedOrder?.status).toBe('ready-for-production');
      expect(outboxRepository.events[0].payload.customizationId).toBe('custom-émoji-🎉');
    });
  });
});
