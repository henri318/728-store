import { describe, it, expect, beforeEach } from 'vitest';
import { MarkAsPaidUseCase } from './mark-as-paid-use-case';
import { MemoryOrderRepository } from '../infrastructure/memory-order-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/shared/events';
import { OrderEntity } from '../domain/order-repository';

describe('MarkAsPaidUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: MarkAsPaidUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new MarkAsPaidUseCase(orderRepository, outboxRepository);
  });

  describe('execute - mark order as paid', () => {
    it('should transition order from pending to paid and emit ORDER_PAID event', async () => {
      // Arrange
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await orderRepository.save(testOrder);

      // Act
      await useCase.execute({
        orderId: 'order-1',
        paymentId: 'payment-1',
        amount: 100,
      });

      // Assert - Order status should be updated
      const updatedOrder = await orderRepository.findById('order-1');
      expect(updatedOrder?.status).toBe('paid');

      // Assert - ORDER_PAID event should be emitted
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_PAID);
      expect(outboxRepository.events[0].payload.orderId).toBe('order-1');
      expect(outboxRepository.events[0].payload.userId).toBe('user-1');
      expect(outboxRepository.events[0].payload.paymentId).toBe('payment-1');
    });

    it('should throw error when order does not exist', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          orderId: 'non-existent-order',
          paymentId: 'payment-1',
          amount: 100,
        })
      ).rejects.toThrow('Order not found');

      // No events should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });

    it('should be idempotent - skip if order is already paid', async () => {
      // Arrange - Create order already in paid status
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await orderRepository.save(testOrder);

      // Act
      await useCase.execute({
        orderId: 'order-1',
        paymentId: 'payment-1',
        amount: 100,
      });

      // Assert - Order status should remain paid
      const updatedOrder = await orderRepository.findById('order-1');
      expect(updatedOrder?.status).toBe('paid');

      // Assert - No duplicate event should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });

    it('should throw error when order is in invalid state (cancelled)', async () => {
      // Arrange
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'cancelled',
        lineItems: [],
      };
      await orderRepository.save(testOrder);

      // Act & Assert
      await expect(
        useCase.execute({
          orderId: 'order-1',
          paymentId: 'payment-1',
          amount: 100,
        })
      ).rejects.toThrow('Invalid state transition');

      // No events should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });

    it('should throw error when order is in ready-for-production state', async () => {
      // Arrange
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'ready-for-production',
        lineItems: [],
      };
      await orderRepository.save(testOrder);

      // Act & Assert
      await expect(
        useCase.execute({
          orderId: 'order-1',
          paymentId: 'payment-1',
          amount: 100,
        })
      ).rejects.toThrow('Invalid state transition');

      // No events should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });
  });
});
