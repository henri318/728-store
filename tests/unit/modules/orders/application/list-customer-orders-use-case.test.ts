import { beforeEach, describe, expect, it } from 'vitest';
import { ListCustomerOrdersUseCase } from '@/modules/orders/application/list-customer-orders-use-case';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';

describe('ListCustomerOrdersUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let useCase: ListCustomerOrdersUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    useCase = new ListCustomerOrdersUseCase(orderRepository);
  });

  it('lists only the customer orders sorted by date', async () => {
    await orderRepository.save({
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 10,
      status: 'new',
      checkoutGroupId: 'group-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lineItems: [],
    });
    await orderRepository.save({
      id: 'order-2',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 20,
      status: 'completed',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
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
      'order-2',
      'order-1',
    ]);
  });
});
