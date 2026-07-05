import { beforeEach, describe, expect, it } from 'vitest';
import { ListSellerOrdersUseCase } from '@/modules/orders/application/list-seller-orders-use-case';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { MemorySellerLookup } from '@/tests/doubles/memory-seller-lookup';

describe('ListSellerOrdersUseCase', () => {
  let sellerLookup: MemorySellerLookup;
  let orderRepository: MemoryOrderRepository;
  let useCase: ListSellerOrdersUseCase;

  beforeEach(() => {
    sellerLookup = new MemorySellerLookup();
    orderRepository = new MemoryOrderRepository();
    useCase = new ListSellerOrdersUseCase(sellerLookup, orderRepository);
  });

  it('resolves the seller from the current user and lists only their orders', async () => {
    sellerLookup.seed({ userId: 'user-1', sellerId: 'seller-1' });

    await orderRepository.save({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 10,
      status: 'new',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      lineItems: [],
    });
    await orderRepository.save({
      id: 'order-2',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 15,
      status: 'completed',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lineItems: [],
    });
    await orderRepository.save({
      id: 'order-3',
      userId: 'user-2',
      sellerId: 'seller-2',
      total: 30,
      status: 'new',
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      lineItems: [],
    });

    const result = await useCase.execute({
      userId: 'user-1',
      status: 'all',
      sortBy: 'createdAt',
      sortDir: 'desc',
      page: 1,
      pageSize: 20,
    });

    expect(result.items.map((order) => order.id)).toEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('fails when the user is not a seller', async () => {
    await expect(
      useCase.execute({
        userId: 'missing',
        status: 'all',
        sortBy: 'createdAt',
        sortDir: 'desc',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toThrow('Seller not found');
  });
});
