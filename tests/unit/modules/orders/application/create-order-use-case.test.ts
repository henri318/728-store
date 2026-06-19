import { describe, it, expect, beforeEach } from 'vitest';
import { CreateOrderUseCase } from '@/modules/orders/application/create-order-use-case';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { MemoryOrderProductRepository } from '@/tests/doubles/memory-order-product-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

describe('CreateOrderUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let productRepository: MemoryOrderProductRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    productRepository = new MemoryOrderProductRepository();
    outboxRepository = new MemoryOutboxRepository();

    // Manual dependency injection for test
    useCase = new CreateOrderUseCase(orderRepository, productRepository, outboxRepository);

    // Seed product — orders' ProductRepository only needs id/basePrice/sellerId
    productRepository.seed([{
      id: 'p1',
      basePrice: 100,
      sellerId: 's1',
    }]);
  });

  const validItem = {
    productId: 'p1',
    quantity: 1,
    customization: {},
  };

  it('should create an order successfully', async () => {
    const result = await useCase.execute({ userId: 'u1', items: [validItem] });

    expect(result.id).toBeDefined();
    expect(result.total).toBe(100);
    expect(result.status).toBe('pending');
  });

  it('should record an ORDER_CREATED event in the outbox', async () => {
    const result = await useCase.execute({ userId: 'u1', items: [validItem] });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_CREATED);
    expect(outboxRepository.events[0].payload.orderId).toBe(result.id);
    expect(outboxRepository.events[0].payload.totalAmount).toBe(100);
  });

  it('should throw an error if the product does not exist', async () => {
    await expect(useCase.execute({
      userId: 'u1',
      items: [{ productId: 'p99', quantity: 1, customization: {} }]
    })).rejects.toThrow('Product with ID p99 not found.');
  });
});
