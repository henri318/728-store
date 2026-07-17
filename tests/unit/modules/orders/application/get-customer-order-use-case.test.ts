import { describe, it, expect, beforeEach } from 'vitest';
import { GetCustomerOrderUseCase } from '@/modules/orders/application/get-customer-order-use-case';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { NotFoundError } from '@/shared/kernel/app-error';

describe('GetCustomerOrderUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let useCase: GetCustomerOrderUseCase;

  const userA = 'user-a';
  const userB = 'user-b';
  const orderId = 'order-1';

  beforeEach(async () => {
    orderRepository = new MemoryOrderRepository();
    useCase = new GetCustomerOrderUseCase(orderRepository);

    await orderRepository.save({
      id: orderId,
      userId: userA,
      sellerId: 'seller-1',
      total: 100,
      status: 'new',
      lineItems: [],
    });
  });

  it('returns the order when found and owned by the user', async () => {
    const order = await useCase.execute(orderId, userA, 'es');

    expect(order.id).toBe(orderId);
    expect(order.userId).toBe(userA);
    expect(order.total).toBe(100);
  });

  it('throws NotFoundError when order does not exist', async () => {
    await expect(useCase.execute('non-existent', userA, 'es')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('throws NotFoundError when order belongs to a different user', async () => {
    await expect(useCase.execute(orderId, userB, 'es')).rejects.toThrow(
      NotFoundError,
    );
  });
});
