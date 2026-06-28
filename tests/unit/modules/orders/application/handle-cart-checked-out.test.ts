import { describe, it, expect, beforeEach } from 'vitest';
import { HandleCartCheckedOut } from '@/modules/orders/application/handle-cart-checked-out';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryTransactionRunner } from '@/tests/doubles/memory-transaction-runner';
import { MemoryOrderCustomizationLookup } from '@/tests/doubles/memory-order-customization-lookup';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/**
 * Tests for HandleCartCheckedOut (spec REQ-ORD-001 / REQ-ORD-002).
 *
 * The handler subscribes to CART_CHECKED_OUT and creates one Order per
 * seller present in the cart. The handler is idempotent: a second
 * delivery with the same cartId MUST NOT create a duplicate set of
 * orders.
 *
 * Coverage:
 *  - Two-seller cart → two orders, each with its own items
 *  - Single-seller cart → one order with all items
 *  - Idempotency on duplicate delivery
 *  - Customization fields preserved on each line item
 *  - ORDER_CREATED event emitted per created order, with payload
 */
describe('HandleCartCheckedOut', () => {
  let orderRepo: MemoryOrderRepository;
  let outboxRepo: MemoryOutboxRepository;
  let txRunner: MemoryTransactionRunner;
  let customizationLookup: MemoryOrderCustomizationLookup;
  let useCase: HandleCartCheckedOut;

  beforeEach(() => {
    orderRepo = new MemoryOrderRepository();
    outboxRepo = new MemoryOutboxRepository();
    txRunner = new MemoryTransactionRunner();
    customizationLookup = new MemoryOrderCustomizationLookup();
    useCase = new HandleCartCheckedOut(
      orderRepo,
      outboxRepo,
      txRunner,
      customizationLookup,
    );
  });

  it('empty cart items produce no orders and no outbox events', async () => {
    await useCase.execute(buildPayload());

    expect(await orderRepo.findAllForTest()).toHaveLength(0);
    expect(outboxRepo.events).toHaveLength(0);
  });

  const buildPayload = (
    overrides: Partial<{
      cartId: string;
      userId: string;
      items: Array<{
        productId: string;
        sellerId: string;
        quantity: number;
        unitPrice: number;
        customizationIdList?: string[];
        customizationSnapshot?: Array<{
          id: string;
          text: string | null;
          color: string | null;
          size: string | null;
          imageUrl: string | null;
        }> | null;
      }>;
      subtotal: number;
      discountApplied: number;
      shippingCost: number;
      totalAmount: number;
      currency: 'EUR';
      isFirstPurchase: boolean;
      occurredAt: string;
    }> = {},
  ) => ({
    cartId: 'cart-1',
    userId: 'user-1',
    items: [],
    subtotal: 0,
    discountApplied: 0,
    shippingCost: 3.99,
    totalAmount: 3.99,
    currency: 'EUR' as const,
    isFirstPurchase: false,
    occurredAt: new Date().toISOString(),
    ...overrides,
  });

  // -------------------------------------------------------------------------
  // Two-seller
  // -------------------------------------------------------------------------

  it('two-seller cart: creates two orders, one per seller, with the matching items', async () => {
    const payload = buildPayload({
      items: [
        { productId: 'p-A', sellerId: 's1', quantity: 1, unitPrice: 10 },
        { productId: 'p-B', sellerId: 's1', quantity: 2, unitPrice: 5 },
        { productId: 'p-C', sellerId: 's2', quantity: 1, unitPrice: 30 },
      ],
    });

    await useCase.execute(payload);

    const allOrders = await orderRepo.findAllForTest();
    expect(allOrders).toHaveLength(2);

    const s1Order = allOrders.find((o) => o.sellerId === 's1');
    const s2Order = allOrders.find((o) => o.sellerId === 's2');
    expect(s1Order).toBeDefined();
    expect(s2Order).toBeDefined();

    // s1 has 2 items, s2 has 1
    const s1LineItems = await orderRepo.getLineItemsByOrderId(s1Order!.id);
    const s2LineItems = await orderRepo.getLineItemsByOrderId(s2Order!.id);
    expect(s1LineItems).toHaveLength(2);
    expect(s2LineItems).toHaveLength(1);

    // Totals reflect the per-seller line totals
    expect(s1Order?.total).toBe(20); // 1*10 + 2*5
    expect(s2Order?.total).toBe(30);

    // 2 ORDER_CREATED events emitted
    const createdEvents = outboxRepo.events.filter(
      (e) => e.eventType === GlobalEvents.ORDER_CREATED,
    );
    expect(createdEvents).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // ORDER_CREATED payload (spec REQ-ORD-002)
  // -------------------------------------------------------------------------

  it('ORDER_CREATED payload contains orderId, userId, sellerId, total, items[] and occurredAt', async () => {
    const payload = buildPayload({
      cartId: 'cart-payload',
      userId: 'user-9',
      items: [
        { productId: 'p-A', sellerId: 's1', quantity: 2, unitPrice: 12 },
        { productId: 'p-B', sellerId: 's1', quantity: 1, unitPrice: 8 },
      ],
    });

    const before = new Date();
    await useCase.execute(payload);
    const after = new Date();

    const createdEvents = outboxRepo.events.filter(
      (e) => e.eventType === GlobalEvents.ORDER_CREATED,
    );
    expect(createdEvents).toHaveLength(1);

    const eventPayload = createdEvents[0].payload as {
      orderId: string;
      userId: string;
      sellerId: string;
      total: number;
      totalAmount: number;
      items: Array<{ productId: string; quantity: number; unitPrice: number }>;
      occurredAt: string;
    };

    // Every required field per spec REQ-ORD-002.
    expect(eventPayload.orderId).toBeDefined();
    expect(eventPayload.userId).toBe('user-9');
    expect(eventPayload.sellerId).toBe('s1');
    expect(eventPayload.total).toBe(32); // 2*12 + 1*8
    expect(eventPayload.totalAmount).toBe(32);

    // items[] carries the per-line breakdown.
    expect(eventPayload.items).toHaveLength(2);
    const productIds = eventPayload.items.map((i) => i.productId).sort();
    expect(productIds).toEqual(['p-A', 'p-B']);

    // Every line item exposes productId, quantity, and unitPrice.
    for (const li of eventPayload.items) {
      expect(typeof li.productId).toBe('string');
      expect(typeof li.quantity).toBe('number');
      expect(typeof li.unitPrice).toBe('number');
    }

    // occurredAt is a valid ISO timestamp between the run window.
    expect(typeof eventPayload.occurredAt).toBe('string');
    const occurredAt = new Date(eventPayload.occurredAt);
    expect(occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('emits one ORDER_CREATED per seller, each with its own line items', async () => {
    const payload = buildPayload({
      items: [
        { productId: 'p-A', sellerId: 's1', quantity: 1, unitPrice: 10 },
        { productId: 'p-B', sellerId: 's2', quantity: 3, unitPrice: 5 },
      ],
    });

    await useCase.execute(payload);

    const createdEvents = outboxRepo.events.filter(
      (e) => e.eventType === GlobalEvents.ORDER_CREATED,
    );
    expect(createdEvents).toHaveLength(2);

    const bySeller = Object.fromEntries(
      createdEvents.map((e) => {
        const p = e.payload as {
          sellerId: string;
          items: unknown[];
          totalAmount: number;
        };
        return [p.sellerId, p];
      }),
    ) as Record<
      string,
      { sellerId: string; items: unknown[]; totalAmount: number }
    >;

    expect(bySeller.s1.items).toHaveLength(1);
    expect(bySeller.s2.items).toHaveLength(1);

    // Each event has its own totalAmount and items[].
    expect(bySeller.s1.totalAmount).toBe(10);
    expect(bySeller.s2.totalAmount).toBe(15);
  });

  // -------------------------------------------------------------------------
  // Single-seller
  // -------------------------------------------------------------------------

  it('single-seller cart: creates one order with all items', async () => {
    const payload = buildPayload({
      items: [
        { productId: 'p-A', sellerId: 's1', quantity: 1, unitPrice: 10 },
        { productId: 'p-B', sellerId: 's1', quantity: 1, unitPrice: 25 },
      ],
    });

    await useCase.execute(payload);

    const allOrders = await orderRepo.findAllForTest();
    expect(allOrders).toHaveLength(1);

    const order = allOrders[0];
    expect(order.sellerId).toBe('s1');
    const lineItems = await orderRepo.getLineItemsByOrderId(order.id);
    expect(lineItems).toHaveLength(2);
    expect(order.total).toBe(35);

    expect(
      outboxRepo.events.filter(
        (e) => e.eventType === GlobalEvents.ORDER_CREATED,
      ),
    ).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  it('idempotent: a second delivery of the same cartId does NOT create duplicate orders', async () => {
    const payload = buildPayload({
      cartId: 'cart-dup',
      items: [
        { productId: 'p-A', sellerId: 's1', quantity: 1, unitPrice: 10 },
        { productId: 'p-B', sellerId: 's2', quantity: 1, unitPrice: 20 },
      ],
    });

    await useCase.execute(payload);
    const createdAfterFirst = outboxRepo.events.length;
    const ordersAfterFirst = await orderRepo.findAllForTest();
    expect(ordersAfterFirst).toHaveLength(2);

    await useCase.execute(payload);

    const ordersAfterSecond = await orderRepo.findAllForTest();
    expect(ordersAfterSecond).toHaveLength(2); // no duplicates

    // No new outbox events on the duplicate run
    expect(outboxRepo.events.length).toBe(createdAfterFirst);
  });

  // -------------------------------------------------------------------------
  // Customization preservation
  // -------------------------------------------------------------------------

  it('preserves customization fields on every line item', async () => {
    const payload = buildPayload({
      items: [
        {
          productId: 'p-A',
          sellerId: 's1',
          quantity: 1,
          unitPrice: 10,
          customizationIdList: ['cust-1'],
          customizationSnapshot: [
            {
              id: 'cust-1',
              text: 'Hello',
              color: 'red',
              size: 'M',
              imageUrl: null,
            },
          ],
        },
      ],
    });

    await useCase.execute(payload);

    const allOrders = await orderRepo.findAllForTest();
    const order = allOrders[0];
    const lineItems = await orderRepo.getLineItemsByOrderId(order.id);
    const li = lineItems[0];
    expect(li.customizationIdList).toEqual(['cust-1']);
    expect(li.customizationSnapshot).toEqual([
      {
        id: 'cust-1',
        text: 'Hello',
        color: 'red',
        size: 'M',
        imageUrl: null,
      },
    ]);
  });

  it('resolves customization snapshots from the lookup when the payload omits them', async () => {
    customizationLookup.seed([
      {
        id: 'cust-lookup-1',
        productId: 'p-A',
        text: 'Resolved',
        color: 'blue',
        size: 'L',
      },
    ]);

    const payload = buildPayload({
      items: [
        {
          productId: 'p-A',
          sellerId: 's1',
          quantity: 1,
          unitPrice: 10,
          customizationIdList: ['cust-lookup-1'],
        },
      ],
    });

    await useCase.execute(payload);

    const order = (await orderRepo.findAllForTest())[0];
    const [lineItem] = await orderRepo.getLineItemsByOrderId(order.id);
    expect(lineItem.customizationSnapshot).toEqual([
      {
        id: 'cust-lookup-1',
        text: 'Resolved',
        color: 'blue',
        size: 'L',
        imageUrl: null,
      },
    ]);
  });

  it('keeps explicit null customization snapshots as null', async () => {
    customizationLookup.seed([
      {
        id: 'cust-null-1',
        productId: 'p-A',
        text: 'Should not be used',
        color: 'red',
      },
    ]);

    const payload = buildPayload({
      items: [
        {
          productId: 'p-A',
          sellerId: 's1',
          quantity: 1,
          unitPrice: 10,
          customizationIdList: ['cust-null-1'],
          customizationSnapshot: null,
        },
      ],
    });

    await useCase.execute(payload);

    const order = (await orderRepo.findAllForTest())[0];
    const [lineItem] = await orderRepo.getLineItemsByOrderId(order.id);
    expect(lineItem.customizationSnapshot).toBeNull();
  });

  it('drops missing customizations from lookup results without failing', async () => {
    customizationLookup.seed([
      {
        id: 'cust-found',
        productId: 'p-A',
        text: 'Found',
        color: 'blue',
      },
    ]);

    const payload = buildPayload({
      items: [
        {
          productId: 'p-A',
          sellerId: 's1',
          quantity: 1,
          unitPrice: 10,
          customizationIdList: ['cust-found', 'cust-missing'],
        },
      ],
    });

    await useCase.execute(payload);

    const order = (await orderRepo.findAllForTest())[0];
    const [lineItem] = await orderRepo.getLineItemsByOrderId(order.id);
    expect(lineItem.customizationSnapshot).toEqual([
      {
        id: 'cust-found',
        text: 'Found',
        color: 'blue',
        size: null,
        imageUrl: null,
      },
    ]);
  });

  it('uses the same transaction object for order, line items, and outbox writes', async () => {
    const txToken = { tx: 'sentinel' };
    const seenTxs: unknown[] = [];

    class TxAwareOrderRepository extends MemoryOrderRepository {
      override async save(
        order: Parameters<MemoryOrderRepository['save']>[0],
        tx?: unknown,
      ) {
        seenTxs.push(tx);
        return super.save(order, tx);
      }

      override async saveOrderLineItems(
        orderId: string,
        lineItems: Parameters<MemoryOrderRepository['saveOrderLineItems']>[1],
        tx?: unknown,
      ) {
        seenTxs.push(tx);
        return super.saveOrderLineItems(orderId, lineItems, tx);
      }

      override async findIdsByCartId(cartId: string, tx?: unknown) {
        seenTxs.push(tx);
        return super.findIdsByCartId(cartId, tx);
      }
    }

    class TxAwareOutboxRepository extends MemoryOutboxRepository {
      override async saveEvent(
        eventType: string,
        payload: unknown,
        tx?: unknown,
      ) {
        seenTxs.push(tx);
        return super.saveEvent(eventType, payload, tx);
      }
    }

    const txAwareOrderRepo = new TxAwareOrderRepository();
    const txAwareOutboxRepo = new TxAwareOutboxRepository();
    const transactionRunner = {
      run: async <T>(work: (tx: unknown) => Promise<T>) => work(txToken),
    };
    const useCaseWithSentinel = new HandleCartCheckedOut(
      txAwareOrderRepo,
      txAwareOutboxRepo,
      transactionRunner,
      customizationLookup,
    );

    const payload = buildPayload({
      cartId: 'cart-tx',
      items: [
        {
          productId: 'p-A',
          sellerId: 's1',
          quantity: 1,
          unitPrice: 10,
          customizationIdList: ['cust-1'],
          customizationSnapshot: [
            {
              id: 'cust-1',
              text: 'Hello',
              color: 'red',
              size: 'M',
              imageUrl: null,
            },
          ],
        },
      ],
    });

    await useCaseWithSentinel.execute(payload);

    expect(seenTxs.length).toBeGreaterThan(0);
    expect(seenTxs.every((tx) => tx === txToken)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Event subscribe
  // -------------------------------------------------------------------------

  it('HandleCartCheckedOut.subscribe wires the handler to the event bus', async () => {
    const handlers: Record<string, ((p: unknown) => Promise<void>)[]> = {};
    const fakeBus = {
      on: (event: string, h: (p: unknown) => Promise<void>) => {
        handlers[event] = handlers[event] ?? [];
        handlers[event].push(h);
      },
      emit: async () => {},
    };

    HandleCartCheckedOut.subscribe(
      fakeBus as unknown as import('@/modules/events/domain/event-bus-port').EventBusPort,
      useCase,
    );

    expect(handlers[GlobalEvents.CART_CHECKED_OUT]).toBeDefined();
    expect(handlers[GlobalEvents.CART_CHECKED_OUT].length).toBe(1);

    const payload = buildPayload({
      items: [{ productId: 'p-A', sellerId: 's1', quantity: 1, unitPrice: 10 }],
    });

    await handlers[GlobalEvents.CART_CHECKED_OUT][0](payload);

    const created = outboxRepo.events.filter(
      (e) => e.eventType === GlobalEvents.ORDER_CREATED,
    );
    expect(created).toHaveLength(1);
  });
});
