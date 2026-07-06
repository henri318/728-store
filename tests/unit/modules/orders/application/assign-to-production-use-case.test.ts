import { describe, it, expect, beforeEach } from 'vitest';
import { AssignToProductionUseCase } from '@/modules/orders/application/assign-to-production-use-case';
import { MarkAsPaidUseCase } from '@/modules/orders/application/mark-as-paid-use-case';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import {
  OrderEntity,
  OrderStatus,
} from '@/modules/orders/domain/order-repository';

describe('AssignToProductionUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: AssignToProductionUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new AssignToProductionUseCase(orderRepository, outboxRepository);
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it('should transition order from in_progress to completed and emit event', async () => {
    const testOrder: OrderEntity = {
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    };
    await orderRepository.save(testOrder);

    await useCase.execute({ orderId: 'order-1', customizationId: 'custom-1' });

    const updatedOrder = await orderRepository.findById('order-1');
    expect(updatedOrder?.status).toBe('completed');

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      GlobalEvents.ORDER_READY_FOR_PRODUCTION,
    );
    const payload = outboxRepository.events[0].payload as {
      orderId: string;
      userId: string;
      customizationId: string;
    };
    expect(payload.orderId).toBe('order-1');
    expect(payload.userId).toBe('user-1');
    expect(payload.customizationId).toBe('custom-1');
  });

  it('should handle production assignment with multiple line items', async () => {
    const orderWithItems: OrderEntity = {
      id: 'order-multi',
      userId: 'user-123',
      sellerId: 'seller-456',
      total: 500,
      status: 'in_progress',
      lineItems: [
        {
          id: 'item-1',
          orderId: 'order-multi',
          productId: 'prod-1',
          quantity: 2,
          customizationIdList: [],
          customizationSnapshot: null,
          unitPrice: 0,
        },
        {
          id: 'item-2',
          orderId: 'order-multi',
          productId: 'prod-2',
          quantity: 1,
          customizationIdList: [],
          customizationSnapshot: null,
          unitPrice: 0,
        },
      ],
    };
    await orderRepository.save(orderWithItems);

    await useCase.execute({
      orderId: 'order-multi',
      customizationId: 'custom-batch',
    });

    const updatedOrder = await orderRepository.findById('order-multi');
    expect(updatedOrder?.status).toBe('completed');
    expect(updatedOrder?.lineItems?.length).toBe(2);

    expect(outboxRepository.events[0].payload).toEqual({
      orderId: 'order-multi',
      userId: 'user-123',
      sellerId: 'seller-456',
      customizationId: 'custom-batch',
      readyAt: expect.any(String),
    });
  });

  it('should handle multiple sequential production assignments', async () => {
    await orderRepository.save({
      id: 'order-a',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    });
    await orderRepository.save({
      id: 'order-b',
      userId: 'u2',
      sellerId: 's2',
      total: 200,
      status: 'in_progress',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'order-a', customizationId: 'c-a' });
    await useCase.execute({ orderId: 'order-b', customizationId: 'c-b' });

    const orderA = await orderRepository.findById('order-a');
    expect(orderA?.status).toBe('completed');
    const orderB = await orderRepository.findById('order-b');
    expect(orderB?.status).toBe('completed');
    expect(outboxRepository.events.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  it('should throw error when order does not exist', async () => {
    await expect(
      useCase.execute({ orderId: 'non-existent', customizationId: 'c-1' }),
    ).rejects.toThrow('Order not found');

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should throw error when order is not in progress (new)', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'new',
      lineItems: [],
    });

    await expect(
      useCase.execute({ orderId: 'o1', customizationId: 'c-1' }),
    ).rejects.toThrow('Order must be in progress before production');

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should throw error when order is cancelled', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'cancelled',
      lineItems: [],
    });

    await expect(
      useCase.execute({ orderId: 'o1', customizationId: 'c-1' }),
    ).rejects.toThrow('Invalid state transition');

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should skip production assignment for completed order', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'completed',
      lineItems: [],
    });

    await expect(
      useCase.execute({ orderId: 'o1', customizationId: 'c-1' }),
    ).resolves.not.toThrow();

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should handle all possible order states correctly', async () => {
    const testCases = [
      {
        state: 'new',
        shouldFail: true,
        error: 'Order must be in progress before production',
      },
      { state: 'in_progress', shouldFail: false },
      { state: 'completed', shouldFail: false }, // idempotent
      {
        state: 'cancelled',
        shouldFail: true,
        error: 'Invalid state transition',
      },
    ];

    for (const tc of testCases) {
      orderRepository = new MemoryOrderRepository();
      outboxRepository = new MemoryOutboxRepository();
      useCase = new AssignToProductionUseCase(
        orderRepository,
        outboxRepository,
      );

      await orderRepository.save({
        id: `o-${tc.state}`,
        userId: 'u1',
        sellerId: 's1',
        total: 100,
        status: tc.state as OrderStatus,
        lineItems: [],
      });

      if (tc.shouldFail) {
        await expect(
          useCase.execute({ orderId: `o-${tc.state}`, customizationId: 'c' }),
        ).rejects.toThrow(tc.error);
      } else if (tc.state === 'completed') {
        await expect(
          useCase.execute({ orderId: `o-${tc.state}`, customizationId: 'c' }),
        ).resolves.not.toThrow();
        expect(outboxRepository.events.length).toBe(0);
      } else {
        await expect(
          useCase.execute({ orderId: `o-${tc.state}`, customizationId: 'c' }),
        ).resolves.not.toThrow();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------------

  it('should be idempotent — skip if order is already completed', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'completed',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', customizationId: 'c-1' });

    const foundOrder = await orderRepository.findById('o1');
    expect(foundOrder?.status).toBe('completed');
    expect(outboxRepository.events.length).toBe(0);
  });

  it('should handle duplicate production assignment events', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', customizationId: 'c-1' });
    const countAfterFirst = outboxRepository.events.length;

    await useCase.execute({ orderId: 'o1', customizationId: 'c-1' });

    expect(outboxRepository.events.length).toBe(countAfterFirst);
    const foundAfterRetry = await orderRepository.findById('o1');
    expect(foundAfterRetry?.status).toBe('completed');
  });

  it('should handle multiple retries of same customization event', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    });

    for (let i = 0; i < 5; i++) {
      await useCase.execute({ orderId: 'o1', customizationId: `c-${i}` });
    }

    expect(outboxRepository.events.length).toBe(1);
    const payload = outboxRepository.events[0].payload as {
      customizationId: string;
    };
    expect(payload.customizationId).toBe('c-0');
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('should handle empty customizationId gracefully', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', customizationId: '' });

    const foundEmpty = await orderRepository.findById('o1');
    expect(foundEmpty?.status).toBe('completed');
  });

  it('should handle order with no line items', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 0,
      status: 'in_progress',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', customizationId: 'c-empty' });

    const foundNoItems = await orderRepository.findById('o1');
    expect(foundNoItems?.status).toBe('completed');
    expect(outboxRepository.events.length).toBe(1);
  });

  it('should handle very large order IDs', async () => {
    const longId = 'order-' + 'x'.repeat(1000);
    await orderRepository.save({
      id: longId,
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    });

    await useCase.execute({ orderId: longId, customizationId: 'c-1' });

    const foundLongId = await orderRepository.findById(longId);
    expect(foundLongId?.status).toBe('completed');
  });

  // ---------------------------------------------------------------------------
  // Event data integrity
  // ---------------------------------------------------------------------------

  it('should emit event with correct timestamp format', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    });

    const before = new Date();
    await useCase.execute({ orderId: 'o1', customizationId: 'c-1' });
    const after = new Date();

    const eventDate = new Date(
      (outboxRepository.events[0].payload as { readyAt: string }).readyAt,
    );
    expect(eventDate).toBeInstanceOf(Date);
    expect(eventDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(eventDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should preserve all order metadata in event', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u-unique',
      sellerId: 's-unique',
      total: 999.99,
      status: 'in_progress',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', customizationId: 'c-meta' });

    const event = outboxRepository.events[0].payload as {
      orderId: string;
      userId: string;
      sellerId: string;
      customizationId: string;
    };
    expect(event.orderId).toBe('o1');
    expect(event.userId).toBe('u-unique');
    expect(event.sellerId).toBe('s-unique');
    expect(event.customizationId).toBe('c-meta');
  });

  // ---------------------------------------------------------------------------
  // Complex scenarios
  // ---------------------------------------------------------------------------

  it('should handle full flow: new → in_progress → completed', async () => {
    await orderRepository.save({
      id: 'o-full',
      userId: 'u1',
      sellerId: 's1',
      total: 200,
      status: 'new',
      lineItems: [],
    });

    const markAsPaid = new MarkAsPaidUseCase(orderRepository, outboxRepository);
    await markAsPaid.execute({
      orderId: 'o-full',
      paymentId: 'pay-1',
      amount: 200,
    });

    const afterPaid = await orderRepository.findById('o-full');
    expect(afterPaid?.status).toBe('in_progress');
    expect(outboxRepository.events.length).toBe(1);

    await useCase.execute({ orderId: 'o-full', customizationId: 'c-1' });

    const afterProduction = await orderRepository.findById('o-full');
    expect(afterProduction?.status).toBe('completed');
    expect(outboxRepository.events.length).toBe(2);
    expect(outboxRepository.events[1].eventType).toBe(
      GlobalEvents.ORDER_READY_FOR_PRODUCTION,
    );
  });
});
