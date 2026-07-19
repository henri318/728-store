import { describe, it, expect, beforeEach } from 'vitest';
import { GetSellerOrderUseCase } from '@/modules/orders/application/get-seller-order-use-case';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { MemoryCustomerNameLookup } from '@/tests/doubles/memory-customer-name-lookup';
import { MemorySellerLookup } from '@/tests/doubles/memory-seller-lookup';
import { NotFoundError } from '@/shared/kernel/app-error';

describe('GetSellerOrderUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let customerNameLookup: MemoryCustomerNameLookup;
  let sellerLookup: MemorySellerLookup;
  let useCase: GetSellerOrderUseCase;

  const sellerUserId = 'seller-user';
  const customerUserId = 'customer-1';
  const otherSellerUserId = 'other-seller';
  const sellerId = 'seller-1';
  const otherSellerId = 'seller-2';
  const orderId = 'order-1';

  beforeEach(async () => {
    orderRepository = new MemoryOrderRepository();
    customerNameLookup = new MemoryCustomerNameLookup();
    sellerLookup = new MemorySellerLookup();

    useCase = new GetSellerOrderUseCase(
      sellerLookup,
      orderRepository,
      customerNameLookup,
    );

    sellerLookup.seed({ userId: sellerUserId, sellerId });
    sellerLookup.seed({ userId: otherSellerUserId, sellerId: otherSellerId });

    customerNameLookup.seed(customerUserId, 'John', 'Doe');

    await orderRepository.save({
      id: orderId,
      userId: customerUserId,
      sellerId,
      total: 100,
      status: 'new',
      lineItems: [],
    });
  });

  it('returns the order and customer name when seller owns the order', async () => {
    const result = await useCase.execute(orderId, sellerUserId, 'es');

    expect(result.order.id).toBe(orderId);
    expect(result.order.total).toBe(100);
    expect(result.customerName).toBe('John Doe');
    expect(result.customerEmail).toBe('john.doe@test.com');
  });

  it('throws NotFoundError when seller does not exist', async () => {
    await expect(
      useCase.execute(orderId, 'unknown-user', 'es'),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when order does not exist', async () => {
    await expect(
      useCase.execute('non-existent', sellerUserId, 'es'),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when a different seller owns the order', async () => {
    await expect(
      useCase.execute(orderId, otherSellerUserId, 'es'),
    ).rejects.toThrow(NotFoundError);
  });

  it('returns null customerName when the order user has no account', async () => {
    await orderRepository.save({
      id: 'order-orphan',
      userId: 'deleted-user',
      sellerId,
      total: 50,
      status: 'new',
      lineItems: [],
    });

    const result = await useCase.execute('order-orphan', sellerUserId, 'es');
    expect(result.customerName).toBeNull();
    expect(result.customerEmail).toBeNull();
  });
});
