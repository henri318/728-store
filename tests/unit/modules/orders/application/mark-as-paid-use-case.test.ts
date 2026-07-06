import { describe, it, expect, beforeEach } from 'vitest';
import { MarkAsPaidUseCase } from '@/modules/orders/application/mark-as-paid-use-case';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import {
  OrderEntity,
  OrderStatus,
} from '@/modules/orders/domain/order-repository';

describe('MarkAsPaidUseCase', () => {
  let orderRepository: MemoryOrderRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: MarkAsPaidUseCase;

  beforeEach(() => {
    orderRepository = new MemoryOrderRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new MarkAsPaidUseCase(orderRepository, outboxRepository);
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it('should transition order from new to in_progress and emit ORDER_PAID event', async () => {
    const testOrder: OrderEntity = {
      id: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      total: 100,
      status: 'new',
      lineItems: [],
    };
    await orderRepository.save(testOrder);

    await useCase.execute({
      orderId: 'order-1',
      paymentId: 'payment-1',
      amount: 100,
    });

    const updatedOrder = await orderRepository.findById('order-1');
    expect(updatedOrder?.status).toBe('in_progress');

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(GlobalEvents.ORDER_PAID);
    const payload = outboxRepository.events[0].payload as {
      orderId: string;
      userId: string;
      paymentId: string;
    };
    expect(payload.orderId).toBe('order-1');
    expect(payload.userId).toBe('user-1');
    expect(payload.paymentId).toBe('payment-1');
  });

  it('should handle complete order lifecycle with multiple line items', async () => {
    const orderWithItems: OrderEntity = {
      id: 'order-multi',
      userId: 'user-123',
      sellerId: 'seller-456',
      total: 350,
      status: 'new',
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
      paymentId: 'pay-1',
      amount: 350,
    });

    const updatedOrder = await orderRepository.findById('order-multi');
    expect(updatedOrder?.status).toBe('in_progress');
    expect(updatedOrder?.lineItems?.length).toBe(2);

    expect(outboxRepository.events[0].payload).toEqual({
      orderId: 'order-multi',
      userId: 'user-123',
      paymentId: 'pay-1',
      totalAmount: 350,
      paidAt: expect.any(String),
    });
  });

  it('should handle multiple sequential payments for different orders', async () => {
    await orderRepository.save({
      id: 'order-a',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'new',
      lineItems: [],
    });
    await orderRepository.save({
      id: 'order-b',
      userId: 'u2',
      sellerId: 's2',
      total: 200,
      status: 'new',
      lineItems: [],
    });

    await useCase.execute({
      orderId: 'order-a',
      paymentId: 'pay-a',
      amount: 100,
    });
    await useCase.execute({
      orderId: 'order-b',
      paymentId: 'pay-b',
      amount: 200,
    });

    const orderA = await orderRepository.findById('order-a');
    expect(orderA?.status).toBe('in_progress');
    const orderB = await orderRepository.findById('order-b');
    expect(orderB?.status).toBe('in_progress');
    expect(outboxRepository.events.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  it('should throw error when order does not exist', async () => {
    await expect(
      useCase.execute({
        orderId: 'non-existent',
        paymentId: 'pay-1',
        amount: 100,
      }),
    ).rejects.toThrow('Order not found');

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should throw error when order is in invalid state (cancelled)', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'cancelled',
      lineItems: [],
    });

    await expect(
      useCase.execute({ orderId: 'o1', paymentId: 'pay-1', amount: 100 }),
    ).rejects.toThrow('Invalid state transition');

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should throw error when order is in completed state', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'completed',
      lineItems: [],
    });

    await expect(
      useCase.execute({ orderId: 'o1', paymentId: 'pay-1', amount: 100 }),
    ).rejects.toThrow('Invalid state transition');

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should reject payment for completed order', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'completed' as OrderStatus,
      lineItems: [],
    });

    await expect(
      useCase.execute({ orderId: 'o1', paymentId: 'pay-1', amount: 100 }),
    ).rejects.toThrow('Invalid state transition');
  });

  it('should handle all possible order states correctly', async () => {
    const states: OrderStatus[] = ['new', 'in_progress', 'completed'];

    for (const state of states) {
      orderRepository = new MemoryOrderRepository();
      outboxRepository = new MemoryOutboxRepository();
      useCase = new MarkAsPaidUseCase(orderRepository, outboxRepository);

      await orderRepository.save({
        id: `o-${state}`,
        userId: 'u1',
        sellerId: 's1',
        total: 100,
        status: state,
        lineItems: [],
      });

      if (state === 'new') {
        await expect(
          useCase.execute({
            orderId: `o-${state}`,
            paymentId: 'p',
            amount: 100,
          }),
        ).resolves.not.toThrow();
      } else if (state === 'in_progress') {
        await expect(
          useCase.execute({
            orderId: `o-${state}`,
            paymentId: 'p',
            amount: 100,
          }),
        ).resolves.not.toThrow();
        expect(outboxRepository.events.length).toBe(0);
      } else {
        await expect(
          useCase.execute({
            orderId: `o-${state}`,
            paymentId: 'p',
            amount: 100,
          }),
        ).rejects.toThrow('Invalid state transition');
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------------

  it('should be idempotent — skip if order is already in progress', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'in_progress',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', paymentId: 'pay-1', amount: 100 });

    const foundIdempotent = await orderRepository.findById('o1');
    expect(foundIdempotent?.status).toBe('in_progress');
    expect(outboxRepository.events.length).toBe(0);
  });

  it('should handle duplicate payment events without side effects', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'new',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', paymentId: 'pay-1', amount: 100 });
    const countAfterFirst = outboxRepository.events.length;

    await useCase.execute({ orderId: 'o1', paymentId: 'pay-1', amount: 100 });

    expect(outboxRepository.events.length).toBe(countAfterFirst);
    const foundDuplicate = await orderRepository.findById('o1');
    expect(foundDuplicate?.status).toBe('in_progress');
  });

  it('should handle multiple retries of same payment event', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'new',
      lineItems: [],
    });

    for (let i = 0; i < 5; i++) {
      await useCase.execute({
        orderId: 'o1',
        paymentId: `pay-${i}`,
        amount: 100,
      });
    }

    expect(outboxRepository.events.length).toBe(1);
    const payload = outboxRepository.events[0].payload as { paymentId: string };
    expect(payload.paymentId).toBe('pay-0');
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('should handle empty paymentId gracefully', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'new',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', paymentId: '', amount: 100 });

    const foundEmpty = await orderRepository.findById('o1');
    expect(foundEmpty?.status).toBe('in_progress');
  });

  it('should handle zero amount payment', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 0,
      status: 'new',
      lineItems: [],
    });

    await useCase.execute({ orderId: 'o1', paymentId: 'pay-0', amount: 0 });

    const foundZero = await orderRepository.findById('o1');
    expect(foundZero?.status).toBe('in_progress');
    expect(outboxRepository.events.length).toBe(1);
  });

  it('should handle payment amount mismatch (partial payment)', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u1',
      sellerId: 's1',
      total: 100,
      status: 'new',
      lineItems: [],
    });

    await useCase.execute({
      orderId: 'o1',
      paymentId: 'pay-partial',
      amount: 50,
    });

    const foundPartial = await orderRepository.findById('o1');
    expect(foundPartial?.status).toBe('in_progress');
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
      status: 'new',
      lineItems: [],
    });

    const before = new Date();
    await useCase.execute({ orderId: 'o1', paymentId: 'pay-1', amount: 100 });
    const after = new Date();

    const eventDate = new Date(
      (outboxRepository.events[0].payload as { paidAt: string }).paidAt,
    );
    expect(eventDate).toBeInstanceOf(Date);
    expect(eventDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(eventDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should preserve order metadata in event payload', async () => {
    await orderRepository.save({
      id: 'o1',
      userId: 'u-unique',
      sellerId: 's-unique',
      total: 999.99,
      status: 'new',
      lineItems: [],
    });

    await useCase.execute({
      orderId: 'o1',
      paymentId: 'pay-1',
      amount: 999.99,
    });

    const event = outboxRepository.events[0].payload as {
      orderId: string;
      userId: string;
      paymentId: string;
      totalAmount: number;
    };
    expect(event.orderId).toBe('o1');
    expect(event.userId).toBe('u-unique');
    expect(event.paymentId).toBe('pay-1');
    expect(event.totalAmount).toBeCloseTo(999.99);
  });
});
