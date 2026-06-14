import { describe, it, expect, beforeEach } from 'vitest';
import { CreateOrderUseCase } from './create-order-use-case';
import { MemoryOrderRepository } from '../infrastructure/memory-order-repository';
import { MemoryProductRepository } from '@/modules/products/infrastructure/memory-product-repository';
import { MemoryOutboxRepository } from '@/shared/kernel/memory-outbox-repository';
import { GlobalEvents } from '@/shared/events';

describe('CreateOrderUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let productRepository: MemoryProductRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    productRepository = new MemoryProductRepository();
    outboxRepository = new MemoryOutboxRepository();
    
    // Manual dependency injection for test
    useCase = new CreateOrderUseCase(orderRepository, productRepository, outboxRepository);

    // Seed product
    productRepository.seed([{
      id: 'p1',
      basePrice: 100,
      sellerId: 's1',
      sellerName: 'Store 1',
      translations: [{ locale: 'es', name: 'Product 1', description: 'Desc' }]
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
