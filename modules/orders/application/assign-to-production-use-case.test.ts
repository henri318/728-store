import { describe, it, expect, beforeEach } from 'vitest';
import { AssignToProductionUseCase } from './assign-to-production-use-case';
import { MemoryOrderRepository } from '../infrastructure/memory-order-repository';
import { MemoryOutboxRepository } from '@/shared/kernel/memory-outbox-repository';
import { GlobalEvents } from '@/shared/events';
import { OrderEntity } from '../domain/order-repository';

describe('AssignToProductionUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: AssignToProductionUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new AssignToProductionUseCase(orderRepository, outboxRepository);
  });

  describe('execute - assign order to production', () => {
    it('should transition order from paid to ready-for-production and emit event', async () => {
      // Arrange
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
        customizationId: 'custom-1',
      });

      // Assert - Order status should be updated
      const updatedOrder = await orderRepository.findById('order-1');
      expect(updatedOrder?.status).toBe('ready-for-production');

      // Assert - ORDER_READY_FOR_PRODUCTION event should be emitted
      expect(outboxRepository.events.length).toBe(1);
      expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_READY_FOR_PRODUCTION);
      expect(outboxRepository.events[0].payload.orderId).toBe('order-1');
      expect(outboxRepository.events[0].payload.userId).toBe('user-1');
      expect(outboxRepository.events[0].payload.customizationId).toBe('custom-1');
    });

    it('should throw error when order does not exist', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          orderId: 'non-existent-order',
          customizationId: 'custom-1',
        })
      ).rejects.toThrow('Order not found');

      // No events should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });

    it('should throw error when order is not paid (pending)', async () => {
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

      // Act & Assert
      await expect(
        useCase.execute({
          orderId: 'order-1',
          customizationId: 'custom-1',
        })
      ).rejects.toThrow('Order must be paid before production');

      // No events should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });

    it('should be idempotent - skip if order is already in ready-for-production', async () => {
      // Arrange - Create order already in ready-for-production status
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'ready-for-production',
        lineItems: [],
      };
      await orderRepository.save(testOrder);

      // Act
      await useCase.execute({
        orderId: 'order-1',
        customizationId: 'custom-1',
      });

      // Assert - Order status should remain ready-for-production
      const updatedOrder = await orderRepository.findById('order-1');
      expect(updatedOrder?.status).toBe('ready-for-production');

      // Assert - No duplicate event should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });

    it('should throw error when order is cancelled', async () => {
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
          customizationId: 'custom-1',
        })
      ).rejects.toThrow('Invalid state transition');

      // No events should be emitted
      expect(outboxRepository.events.length).toBe(0);
    });
  });
});
