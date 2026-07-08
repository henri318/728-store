import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';
import { MemoryEmailQueueRepository } from '@/tests/doubles/memory-email-queue-repository';
import { HandleOrderPlaced } from '@/modules/email/application/handlers/handle-order-placed';
import {
  HandleOrderInProgress,
  type OrderInProgressPayload,
} from '@/modules/email/application/handlers/handle-order-in-progress';
import {
  HandleOrderCompleted,
  type OrderCompletedPayload,
} from '@/modules/email/application/handlers/handle-order-completed';
import type { EmailOrderLookupPort } from '@/modules/email/domain/ports/email-order-lookup-port';

function createLookupMock() {
  return {
    findBuyerContextByOrderId: vi.fn(),
    getSummaryForEmail: vi.fn(),
  } satisfies EmailOrderLookupPort;
}

describe('HandleOrderPlaced', () => {
  let queueRepository: MemoryEmailQueueRepository;
  let orderLookup: EmailOrderLookupPort;

  beforeEach(() => {
    queueRepository = new MemoryEmailQueueRepository();
    orderLookup = createLookupMock();
  });

  it('queues an order-placed email for the buyer', async () => {
    vi.mocked(orderLookup.findBuyerContextByOrderId).mockResolvedValue({
      email: 'buyer@test.com',
      firstName: 'Ana',
      locale: 'fr',
    });
    vi.mocked(orderLookup.getSummaryForEmail).mockResolvedValue({
      orderNumber: 'ORD-123',
      total: 125.5,
      currency: 'EUR',
      itemsCount: 3,
    });

    const handler = new HandleOrderPlaced(queueRepository, orderLookup);
    await handler.handle({
      orderId: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      totalAmount: 125.5,
      items: [{ productId: 'product-1', quantity: 1, unitPrice: 125.5 }],
      occurredAt: '2026-07-08T10:15:00.000Z',
    });

    expect(queueRepository.all()).toHaveLength(1);
    const entry = queueRepository.all()[0];
    expect(entry).toMatchObject({
      to: 'buyer@test.com',
      template: 'order-placed',
      metadata: {
        orderId: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
      },
    });
    expect(entry.idempotencyKey).toBe(
      buildIdempotencyKey('order-placed', 'buyer@test.com', 'order-1'),
    );
    expect(entry.subject).toBe('Confirmamos tu pedido');
    expect(entry.htmlBody).toContain('Hola Ana');
    expect(entry.htmlBody).toContain('#ORD-123');
    expect(entry.htmlBody).toContain('3');
    expect(entry.htmlBody).toContain('EUR 125.50');
  });

  it('does nothing when the buyer or summary lookup fails', async () => {
    vi.mocked(orderLookup.findBuyerContextByOrderId).mockResolvedValue(null);
    vi.mocked(orderLookup.getSummaryForEmail).mockResolvedValue(null);

    const handler = new HandleOrderPlaced(queueRepository, orderLookup);
    await handler.handle({
      orderId: 'missing-order',
      userId: 'user-1',
      sellerId: 'seller-1',
      totalAmount: 125.5,
      items: [],
      occurredAt: '2026-07-08T10:15:00.000Z',
    });

    expect(queueRepository.all()).toHaveLength(0);
  });

  it.each([
    null,
    undefined,
    {},
    { orderId: 'order-1' },
    { userId: 'user-1' },
    { sellerId: 'seller-1' },
  ])('does nothing for malformed payloads: %s', async (payload) => {
    const handler = new HandleOrderPlaced(queueRepository, orderLookup);

    await handler.handle(payload as Parameters<HandleOrderPlaced['handle']>[0]);

    expect(orderLookup.findBuyerContextByOrderId).not.toHaveBeenCalled();
    expect(orderLookup.getSummaryForEmail).not.toHaveBeenCalled();
    expect(queueRepository.all()).toHaveLength(0);
  });
});

describe('HandleOrderInProgress', () => {
  let queueRepository: MemoryEmailQueueRepository;
  let orderLookup: EmailOrderLookupPort;

  beforeEach(() => {
    queueRepository = new MemoryEmailQueueRepository();
    orderLookup = createLookupMock();
  });

  it('queues an order-in-progress email for the buyer', async () => {
    vi.mocked(orderLookup.findBuyerContextByOrderId).mockResolvedValue({
      email: 'buyer@test.com',
      firstName: 'Ana',
      locale: 'fr',
    });
    vi.mocked(orderLookup.getSummaryForEmail).mockResolvedValue({
      orderNumber: 'ORD-123',
      total: 125.5,
      currency: 'EUR',
      itemsCount: 3,
    });

    const handler = new HandleOrderInProgress(queueRepository, orderLookup);
    await handler.handle({
      orderId: 'order-1',
      userId: 'user-1',
      paymentId: 'payment-1',
      totalAmount: 125.5,
      paidAt: '2026-07-08T10:15:00.000Z',
    } satisfies OrderInProgressPayload);

    expect(queueRepository.all()).toHaveLength(1);
    const entry = queueRepository.all()[0];
    expect(entry).toMatchObject({
      to: 'buyer@test.com',
      template: 'order-in-progress',
      metadata: {
        orderId: 'order-1',
        userId: 'user-1',
        paymentId: 'payment-1',
        paidAt: '2026-07-08T10:15:00.000Z',
        totalAmount: 125.5,
      },
    });
    expect(entry.idempotencyKey).toBe(
      buildIdempotencyKey('order-in-progress', 'buyer@test.com', 'order-1'),
    );
    expect(entry.subject).toBe('Tu pedido está en preparación');
    expect(entry.htmlBody).toContain('Hola Ana');
    expect(entry.htmlBody).toContain('#ORD-123');
    expect(entry.htmlBody).toContain('3');
    expect(entry.htmlBody).toContain('EUR 125.50');
  });

  it('does nothing when the buyer or summary lookup fails', async () => {
    vi.mocked(orderLookup.findBuyerContextByOrderId).mockResolvedValue(null);
    vi.mocked(orderLookup.getSummaryForEmail).mockResolvedValue(null);

    const handler = new HandleOrderInProgress(queueRepository, orderLookup);
    await handler.handle({
      orderId: 'missing-order',
      userId: 'user-1',
      paymentId: 'payment-1',
      totalAmount: 125.5,
      paidAt: '2026-07-08T10:15:00.000Z',
    });

    expect(queueRepository.all()).toHaveLength(0);
  });

  it.each([
    null,
    undefined,
    {},
    { orderId: 'order-1' },
    { userId: 'user-1' },
    { paymentId: 'payment-1' },
    { paidAt: '2026-07-08T10:15:00.000Z' },
  ])('does nothing for malformed payloads: %s', async (payload) => {
    const handler = new HandleOrderInProgress(queueRepository, orderLookup);

    await handler.handle(
      payload as Parameters<HandleOrderInProgress['handle']>[0],
    );

    expect(orderLookup.findBuyerContextByOrderId).not.toHaveBeenCalled();
    expect(orderLookup.getSummaryForEmail).not.toHaveBeenCalled();
    expect(queueRepository.all()).toHaveLength(0);
  });
});

describe('HandleOrderCompleted', () => {
  let queueRepository: MemoryEmailQueueRepository;
  let orderLookup: EmailOrderLookupPort;

  beforeEach(() => {
    queueRepository = new MemoryEmailQueueRepository();
    orderLookup = createLookupMock();
  });

  it('queues an order-completed email for the buyer', async () => {
    vi.mocked(orderLookup.findBuyerContextByOrderId).mockResolvedValue({
      email: 'buyer@test.com',
      firstName: 'Ana',
      locale: 'fr',
    });
    vi.mocked(orderLookup.getSummaryForEmail).mockResolvedValue({
      orderNumber: 'ORD-123',
      total: 125.5,
      currency: 'EUR',
      itemsCount: 3,
    });

    const handler = new HandleOrderCompleted(queueRepository, orderLookup);
    await handler.handle({
      orderId: 'order-1',
      userId: 'user-1',
      sellerId: 'seller-1',
      customizationId: 'custom-1',
      readyAt: '2026-07-08T10:15:00.000Z',
    } satisfies OrderCompletedPayload);

    expect(queueRepository.all()).toHaveLength(1);
    const entry = queueRepository.all()[0];
    expect(entry).toMatchObject({
      to: 'buyer@test.com',
      template: 'order-completed',
      metadata: {
        orderId: 'order-1',
        userId: 'user-1',
        sellerId: 'seller-1',
        customizationId: 'custom-1',
        readyAt: '2026-07-08T10:15:00.000Z',
      },
    });
    expect(entry.idempotencyKey).toBe(
      buildIdempotencyKey('order-completed', 'buyer@test.com', 'order-1'),
    );
    expect(entry.subject).toBe('Tu pedido está listo');
    expect(entry.htmlBody).toContain('Hola Ana');
    expect(entry.htmlBody).toContain('#ORD-123');
    expect(entry.htmlBody).toContain('3');
    expect(entry.htmlBody).toContain('EUR 125.50');
  });

  it('does nothing when the buyer or summary lookup fails', async () => {
    vi.mocked(orderLookup.findBuyerContextByOrderId).mockResolvedValue(null);
    vi.mocked(orderLookup.getSummaryForEmail).mockResolvedValue(null);

    const handler = new HandleOrderCompleted(queueRepository, orderLookup);
    await handler.handle({
      orderId: 'missing-order',
      userId: 'user-1',
      sellerId: 'seller-1',
      customizationId: 'custom-1',
      readyAt: '2026-07-08T10:15:00.000Z',
    });

    expect(queueRepository.all()).toHaveLength(0);
  });

  it.each([
    null,
    undefined,
    {},
    { orderId: 'order-1' },
    { userId: 'user-1' },
    { sellerId: 'seller-1' },
    { customizationId: 'custom-1' },
    { readyAt: '2026-07-08T10:15:00.000Z' },
  ])('does nothing for malformed payloads: %s', async (payload) => {
    const handler = new HandleOrderCompleted(queueRepository, orderLookup);

    await handler.handle(
      payload as Parameters<HandleOrderCompleted['handle']>[0],
    );

    expect(orderLookup.findBuyerContextByOrderId).not.toHaveBeenCalled();
    expect(orderLookup.getSummaryForEmail).not.toHaveBeenCalled();
    expect(queueRepository.all()).toHaveLength(0);
  });
});
