import { describe, it, expect } from 'vitest';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';

describe('MemoryOrderRepository', () => {
  it('counts completed and legacy paid orders as paid purchases', async () => {
    const repo = new MemoryOrderRepository();

    await repo.save({
      id: 'order-completed',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 100,
      status: 'completed',
      lineItems: [],
    });

    await repo.save({
      id: 'order-paid',
      userId: 'user-1',
      sellerId: 'seller-2',
      total: 100,
      status: 'paid',
      lineItems: [],
    });

    await repo.save({
      id: 'order-new',
      userId: 'user-1',
      sellerId: 'seller-3',
      total: 100,
      status: 'new',
      lineItems: [],
    });

    await expect(repo.countPaidByUserId('user-1')).resolves.toBe(2);
  });
});
