import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { OrderEntity } from '@/modules/orders/domain/order-repository';

describe('OrderRepository', () => {
  let repository: MemoryOrderRepository;

  beforeEach(() => {
    repository = new MemoryOrderRepository();
  });

  describe('findById', () => {
    it('should find an order by id', async () => {
      // Arrange
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await repository.save(testOrder);

      // Act
      const result = await repository.findById('order-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('order-1');
      expect(result?.userId).toBe('user-1');
    });

    it('should return null when order does not exist', async () => {
      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update order status from pending to paid', async () => {
      // Arrange
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'pending',
        lineItems: [],
      };
      await repository.save(testOrder);

      // Act
      await repository.updateStatus('order-1', 'paid');

      // Assert
      const updated = await repository.findById('order-1');
      expect(updated?.status).toBe('paid');
    });

    it('should update order status from paid to ready-for-production', async () => {
      // Arrange
      const testOrder: OrderEntity = {
        id: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        total: 100,
        status: 'paid',
        lineItems: [],
      };
      await repository.save(testOrder);

      // Act
      await repository.updateStatus('order-1', 'ready-for-production');

      // Assert
      const updated = await repository.findById('order-1');
      expect(updated?.status).toBe('ready-for-production');
    });

    it('should throw error when updating non-existent order', async () => {
      // Act & Assert
      await expect(
        repository.updateStatus('non-existent-id', 'paid'),
      ).rejects.toThrow('Order not found');
    });
  });
});
