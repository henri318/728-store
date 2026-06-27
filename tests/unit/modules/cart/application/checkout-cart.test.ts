import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckoutCart } from '@/modules/cart/application/checkout-cart';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { MemoryCartProductRepository } from '@/tests/doubles/memory-cart-product-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryTransactionRunner } from '@/tests/doubles/memory-transaction-runner';
import { MemoryPaidOrderCount } from '@/tests/doubles/memory-paid-order-count';
import { MemoryCustomizationLookup } from '@/tests/doubles/memory-customization-lookup';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import {
  EmptyCartError,
  PriceChangedError,
  CartNotFoundError,
} from '@/modules/cart/domain/errors';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';

/**
 * Tests for CheckoutCart (spec REQ-CART-014 / REQ-CART-015 / REQ-CART-016).
 *
 * Two-step API:
 *  - preview(userId)   — validates prices, returns priceChanges[] if any;
 *                         does NOT mutate state.
 *  - confirm(userId, acceptPriceChanges) — atomic transition to CHECKED_OUT
 *                                          + emits CartCheckedOut.
 *
 * Coverage:
 *  - Happy path single seller: subtotal €20, discount €0, shipping €3.99, total €23.99
 *  - First-purchase discount: subtotal €50 → discount €5, total €48.99
 *  - Discount boundary: subtotal €0.01 → discount €0 (rounded to cents)
 *  - Shipping is flat: 1 seller or 5 sellers → €3.99
 *  - Multi-seller: payload carries every item with its sellerId
 *  - Currency is always EUR
 *  - Price change: preview returns PriceChangedError with priceChanges[]
 *  - Confirm reject: leaves cart ACTIVE, no outbox event
 *  - Confirm accept: updates snapshots, emits event
 *  - Empty cart: EmptyCartError
 *  - Cart not found: CartNotFoundError
 *  - Checked-out cart: CartImmutableError
 *  - Atomicity: status update + outbox row in same logical unit
 *  - Customization snapshot inclusion in CART_CHECKED_OUT event
 */
describe('CheckoutCart', () => {
  let cartRepo: MemoryCartRepository;
  let productRepo: MemoryCartProductRepository;
  let outboxRepo: MemoryOutboxRepository;
  let paidOrderPort: MemoryPaidOrderCount;
  let txRunner: MemoryTransactionRunner;
  let customizationLookup: MemoryCustomizationLookup;
  let useCase: CheckoutCart;

  const makeItem = (
    overrides: Partial<CartItemEntity> = {},
  ): CartItemEntity => ({
    id: 'i-default',
    cartId: 'c1',
    productId: ProductId.create('p1'),
    sellerId: SellerId.create('s1'),
    quantity: 1,
    unitPriceSnapshot: Money.create(10, Currency.EUR),
    customizationIdList: [],
    ...overrides,
  });

  const makeCart = (overrides: Partial<CartEntity> = {}): CartEntity => ({
    id: 'c1',
    userId: 'u1',
    status: CartStatus.Active,
    items: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    cartRepo = new MemoryCartRepository();
    productRepo = new MemoryCartProductRepository();
    outboxRepo = new MemoryOutboxRepository();
    paidOrderPort = new MemoryPaidOrderCount();
    txRunner = new MemoryTransactionRunner();
    customizationLookup = new MemoryCustomizationLookup();
    useCase = new CheckoutCart(
      cartRepo,
      productRepo,
      outboxRepo,
      paidOrderPort,
      txRunner,
      customizationLookup,
    );
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('happy path single seller: subtotal €20, shipping €3.99, total €23.99', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(1); // not first purchase
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            quantity: 2,
          }),
        ],
      }),
    );

    const result = await useCase.confirm('u1', false);

    expect(result.totals.subtotal).toBe(20);
    expect(result.totals.discount).toBe(0);
    expect(result.totals.shipping).toBe(3.99);
    expect(result.totals.total).toBe(23.99);
    expect(result.totals.currency).toBe(Currency.EUR);
    expect(result.totals.isFirstPurchase).toBe(false);

    const cart = await cartRepo.findById(
      await import('@/modules/cart/domain/value-objects/cart-id').then((m) =>
        m.CartId.create('c1'),
      ),
    );
    expect(cart?.status).toBe(CartStatus.CheckedOut);
  });

  it('first-purchase discount: 10% off subtotal', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 50, sellerId: 's1' }]);
    paidOrderPort.setCount(0); // first purchase
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            sellerId: SellerId.create('s1'),
            unitPriceSnapshot: Money.create(50, Currency.EUR),
          }),
        ],
      }),
    );

    const result = await useCase.confirm('u1', false);

    expect(result.totals.subtotal).toBe(50);
    expect(result.totals.discount).toBe(5);
    expect(result.totals.shipping).toBe(3.99);
    expect(result.totals.total).toBe(48.99);
    expect(result.totals.isFirstPurchase).toBe(true);
  });

  it('discount boundary: subtotal €0.01 → discount €0.00 (rounded to cents)', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 0.01, sellerId: 's1' }]);
    paidOrderPort.setCount(0);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            sellerId: SellerId.create('s1'),
            unitPriceSnapshot: Money.create(0.01, Currency.EUR),
          }),
        ],
      }),
    );

    const result = await useCase.confirm('u1', false);

    expect(result.totals.discount).toBe(0);
    expect(result.totals.shipping).toBe(3.99);
    expect(result.totals.total).toBeCloseTo(3.99 + 0.01, 2);
  });

  it('shipping is a single flat rate (1 seller or 5 sellers → €3.99)', async () => {
    productRepo.seed([
      { id: 'p1', basePrice: 10, sellerId: 's1' },
      { id: 'p2', basePrice: 20, sellerId: 's2' },
      { id: 'p3', basePrice: 30, sellerId: 's3' },
      { id: 'p4', basePrice: 40, sellerId: 's4' },
      { id: 'p5', basePrice: 50, sellerId: 's5' },
    ]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            unitPriceSnapshot: Money.create(10, Currency.EUR),
          }),
          makeItem({
            id: 'i2',
            cartId: 'c1',
            productId: ProductId.create('p2'),
            sellerId: SellerId.create('s2'),
            unitPriceSnapshot: Money.create(20, Currency.EUR),
          }),
          makeItem({
            id: 'i3',
            cartId: 'c1',
            productId: ProductId.create('p3'),
            sellerId: SellerId.create('s3'),
            unitPriceSnapshot: Money.create(30, Currency.EUR),
          }),
          makeItem({
            id: 'i4',
            cartId: 'c1',
            productId: ProductId.create('p4'),
            sellerId: SellerId.create('s4'),
            unitPriceSnapshot: Money.create(40, Currency.EUR),
          }),
          makeItem({
            id: 'i5',
            cartId: 'c1',
            productId: ProductId.create('p5'),
            sellerId: SellerId.create('s5'),
            unitPriceSnapshot: Money.create(50, Currency.EUR),
          }),
        ],
      }),
    );

    const result = await useCase.confirm('u1', false);

    expect(result.totals.shipping).toBe(3.99);
    expect(result.totals.subtotal).toBe(150);
  });

  it('multi-seller: payload carries every item with its sellerId', async () => {
    productRepo.seed([
      { id: 'p1', basePrice: 10, sellerId: 's1' },
      { id: 'p2', basePrice: 20, sellerId: 's1' },
      { id: 'p3', basePrice: 30, sellerId: 's2' },
    ]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            sellerId: SellerId.create('s1'),
            unitPriceSnapshot: Money.create(10, Currency.EUR),
          }),
          makeItem({
            id: 'i2',
            cartId: 'c1',
            productId: ProductId.create('p2'),
            sellerId: SellerId.create('s1'),
            unitPriceSnapshot: Money.create(20, Currency.EUR),
          }),
          makeItem({
            id: 'i3',
            cartId: 'c1',
            productId: ProductId.create('p3'),
            sellerId: SellerId.create('s2'),
            unitPriceSnapshot: Money.create(30, Currency.EUR),
          }),
        ],
      }),
    );

    const result = await useCase.confirm('u1', false);

    const payload = result.eventPayload as {
      items: Array<{ productId: string; sellerId: string; quantity: number }>;
    };
    expect(payload.items).toHaveLength(3);
    const sellers = payload.items.map((i) => i.sellerId).sort();
    expect(sellers).toEqual(['s1', 's1', 's2']);
  });

  it('emits CartCheckedOut event with the full payload', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(0);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1', quantity: 2 })],
      }),
    );

    await useCase.confirm('u1', false);

    expect(outboxRepo.events).toHaveLength(1);
    expect(outboxRepo.events[0].eventType).toBe(GlobalEvents.CART_CHECKED_OUT);
    const payload = outboxRepo.events[0].payload as {
      cartId: string;
      userId: string;
      items: unknown[];
      subtotal: number;
      discountApplied: number;
      shippingCost: number;
      totalAmount: number;
      currency: string;
      isFirstPurchase: boolean;
    };
    expect(payload.cartId).toBe('c1');
    expect(payload.userId).toBe('u1');
    expect(payload.items).toHaveLength(1);
    expect(payload.subtotal).toBe(20);
    expect(payload.discountApplied).toBe(2);
    expect(payload.shippingCost).toBe(3.99);
    expect(payload.totalAmount).toBe(21.99);
    expect(payload.currency).toBe('EUR');
    expect(payload.isFirstPurchase).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Customization snapshot in event payload
  // -------------------------------------------------------------------------

  it('includes customizationSnapshot in CART_CHECKED_OUT event items', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    customizationLookup.seed([
      { id: 'c1', productId: 'p1', text: 'Hello', color: 'red', size: 'M' },
    ]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            customizationIdList: ['c1'],
          }),
        ],
      }),
    );

    await useCase.confirm('u1', false);

    const payload = outboxRepo.events[0].payload as {
      items: Array<{
        customizationIdList: string[];
        customizationSnapshot: Array<{
          id: string;
          text: string | null;
          color: string | null;
          size: string | null;
          imageUrl: string | null;
        }> | null;
      }>;
    };
    expect(payload.items[0].customizationIdList).toEqual(['c1']);
    expect(payload.items[0].customizationSnapshot).toEqual([
      { id: 'c1', text: 'Hello', color: 'red', size: 'M', imageUrl: null },
    ]);
  });

  it('customizationSnapshot is null when item has no customizations', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    await useCase.confirm('u1', false);

    const payload = outboxRepo.events[0].payload as {
      items: Array<{
        customizationSnapshot: unknown;
      }>;
    };
    expect(payload.items[0].customizationSnapshot).toBeNull();
  });

  it('omits missing customizations from snapshot (deleted after add)', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    // Only seed c1, not c-deleted
    customizationLookup.seed([
      { id: 'c1', productId: 'p1', text: 'Hello', color: 'red', size: 'M' },
    ]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            customizationIdList: ['c1', 'c-deleted'],
          }),
        ],
      }),
    );

    await useCase.confirm('u1', false);

    const payload = outboxRepo.events[0].payload as {
      items: Array<{
        customizationIdList: string[];
        customizationSnapshot: Array<{ id: string }> | null;
      }>;
    };
    expect(payload.items[0].customizationIdList).toEqual(['c1', 'c-deleted']);
    // Only c1 is in the snapshot — c-deleted was silently omitted
    expect(payload.items[0].customizationSnapshot).toEqual([
      { id: 'c1', text: 'Hello', color: 'red', size: 'M', imageUrl: null },
    ]);
  });

  it('returns empty snapshot array when ALL customizations are deleted', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    // Seed nothing — both customizations were deleted after add
    customizationLookup.seed([]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            customizationIdList: ['c-deleted-1', 'c-deleted-2'],
          }),
        ],
      }),
    );

    await useCase.confirm('u1', false);

    const payload = outboxRepo.events[0].payload as {
      items: Array<{
        customizationIdList: string[];
        customizationSnapshot: Array<{ id: string }> | null;
      }>;
    };
    // customizationIdList is preserved as-is (the original IDs)
    expect(payload.items[0].customizationIdList).toEqual([
      'c-deleted-1',
      'c-deleted-2',
    ]);
    // All IDs were deleted → snapshot is an empty array (not null).
    // null is only returned when customizationIdList itself is empty.
    expect(payload.items[0].customizationSnapshot).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Price change detection
  // -------------------------------------------------------------------------

  it('preview detects a price change and returns PriceChangedError with diff', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 12, sellerId: 's1' }]); // current 12
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            unitPriceSnapshot: Money.create(10, Currency.EUR),
          }),
        ],
      }),
    );

    await expect(useCase.preview('u1')).rejects.toBeInstanceOf(
      PriceChangedError,
    );

    // Cart remains ACTIVE — preview is read-only.
    const cart = await cartRepo.findActiveByUserId('u1');
    expect(cart?.status).toBe(CartStatus.Active);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('preview includes every changed item in priceChanges[]', async () => {
    productRepo.seed([
      { id: 'p1', basePrice: 12, sellerId: 's1' },
      { id: 'p2', basePrice: 25, sellerId: 's1' }, // unchanged
    ]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            unitPriceSnapshot: Money.create(10, Currency.EUR),
          }),
          makeItem({
            id: 'i2',
            cartId: 'c1',
            productId: ProductId.create('p2'),
            unitPriceSnapshot: Money.create(25, Currency.EUR),
          }),
        ],
      }),
    );

    try {
      await useCase.preview('u1');
      expect.unreachable('preview should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PriceChangedError);
      const changes = (err as PriceChangedError).priceChanges;
      expect(changes).toHaveLength(1);
      expect(changes[0].itemId).toBe('i1');
      expect(changes[0].oldPrice.amount).toBe(10);
      expect(changes[0].newPrice.amount).toBe(12);
    }
  });

  it('confirm with acceptPriceChanges=false on a price mismatch aborts', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 12, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            unitPriceSnapshot: Money.create(10, Currency.EUR),
          }),
        ],
      }),
    );

    await expect(useCase.confirm('u1', false)).rejects.toBeInstanceOf(
      PriceChangedError,
    );

    const cart = await cartRepo.findActiveByUserId('u1');
    expect(cart?.status).toBe(CartStatus.Active);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('confirm with acceptPriceChanges=true updates snapshots and proceeds', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 12, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            unitPriceSnapshot: Money.create(10, Currency.EUR),
          }),
        ],
      }),
    );

    const result = await useCase.confirm('u1', true);

    expect(result.totals.subtotal).toBe(12); // current price, not snapshot
    expect(outboxRepo.events).toHaveLength(1);

    const cart = await cartRepo.findById(
      await import('@/modules/cart/domain/value-objects/cart-id').then((m) =>
        m.CartId.create('c1'),
      ),
    );
    expect(cart?.status).toBe(CartStatus.CheckedOut);
    expect(cart?.items[0].unitPriceSnapshot.amount).toBe(12);
  });

  // -------------------------------------------------------------------------
  // Error cases
  // -------------------------------------------------------------------------

  it('rejects checkout of an empty cart with EmptyCartError', async () => {
    await cartRepo.save(makeCart({ id: 'c1', userId: 'u1', items: [] }));

    await expect(useCase.preview('u1')).rejects.toBeInstanceOf(EmptyCartError);
    await expect(useCase.confirm('u1', false)).rejects.toBeInstanceOf(
      EmptyCartError,
    );
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('rejects checkout when the user has no active cart with CartNotFoundError', async () => {
    await expect(useCase.preview('u1')).rejects.toBeInstanceOf(
      CartNotFoundError,
    );
    await expect(useCase.confirm('u1', false)).rejects.toBeInstanceOf(
      CartNotFoundError,
    );
  });

  it('a user who already checked out has no active cart → CartNotFoundError on the second attempt', async () => {
    // Once a cart is checked out, the user must create a new active cart
    // before they can check out again. The CHECKED_OUT cart itself is no
    // longer visible to findActiveByUserId, so a second checkout attempt
    // surfaces CartNotFoundError rather than re-using the closed cart.
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );
    await useCase.confirm('u1', false);

    await expect(useCase.preview('u1')).rejects.toBeInstanceOf(
      CartNotFoundError,
    );
    await expect(useCase.confirm('u1', false)).rejects.toBeInstanceOf(
      CartNotFoundError,
    );
  });

  // -------------------------------------------------------------------------
  // Atomicity / preview is read-only
  // -------------------------------------------------------------------------

  it('preview is read-only (no outbox event, cart stays ACTIVE)', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    const preview = await useCase.preview('u1');

    expect(preview.subtotal).toBe(10);
    expect(preview.shipping).toBe(3.99);
    expect(preview.total).toBe(13.99);

    const cart = await cartRepo.findActiveByUserId('u1');
    expect(cart?.status).toBe(CartStatus.Active);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('preview called twice returns the same totals (idempotent read)', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1', quantity: 2 })],
      }),
    );

    const p1 = await useCase.preview('u1');
    const p2 = await useCase.preview('u1');

    expect(p1.subtotal).toBe(p2.subtotal);
    expect(p1.total).toBe(p2.total);
  });

  // -------------------------------------------------------------------------
  // Atomicity (spec REQ-CART-022) — Transactional Outbox Pattern
  // -------------------------------------------------------------------------

  it('wraps markCheckedOut + saveEvent in a single transactionRunner.run()', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    // Spy on the transaction runner: capture every work callback so we
    // can assert both writes happened inside a single run() invocation.
    const runSpy = vi.fn();
    const trackedRunner: TransactionRunner = {
      run: <T>(work: (tx: unknown) => Promise<T>) => {
        runSpy(work);
        return work(undefined);
      },
    };
    const trackedUseCase = new CheckoutCart(
      cartRepo,
      productRepo,
      outboxRepo,
      paidOrderPort,
      trackedRunner,
      customizationLookup,
    );

    await trackedUseCase.confirm('u1', false);

    expect(runSpy).toHaveBeenCalledTimes(1);
    // Cart is checked out AND the outbox has exactly one event.
    const cart = await cartRepo.findById(
      await import('@/modules/cart/domain/value-objects/cart-id').then((m) =>
        m.CartId.create('c1'),
      ),
    );
    expect(cart?.status).toBe(CartStatus.CheckedOut);
    expect(outboxRepo.events).toHaveLength(1);
  });

  it('if the transaction runner aborts, no writes happen (atomic rollback contract)', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    paidOrderPort.setCount(1);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    // Spy on the cart write AND the outbox write — they must NOT be
    // called when the transaction runner aborts. This proves the
    // production contract: every write goes through the same `run()`
    // callback, so a DB-side rollback reverts them all together.
    const markCheckedOutSpy = vi.spyOn(cartRepo, 'markCheckedOut');
    const saveEventSpy = vi.spyOn(outboxRepo, 'saveEvent');

    // Custom runner: simulates a DB failure BEFORE the work callback
    // is invoked. In production, the Prisma runner does the same on
    // a connection error — the entire unit of work is discarded.
    const abortingRunner: TransactionRunner = {
      run: vi.fn(async <T>(_work: (tx: unknown) => Promise<T>) => {
        throw new Error('transaction aborted');
      }),
    };
    const abortedUseCase = new CheckoutCart(
      cartRepo,
      productRepo,
      outboxRepo,
      paidOrderPort,
      abortingRunner,
      customizationLookup,
    );

    await expect(abortedUseCase.confirm('u1', false)).rejects.toThrow(
      'transaction aborted',
    );

    // Neither write was issued because the work callback never ran.
    expect(markCheckedOutSpy).not.toHaveBeenCalled();
    expect(saveEventSpy).not.toHaveBeenCalled();

    // Cart stays ACTIVE — no side effects leaked out of the aborted
    // transaction.
    const cart = await cartRepo.findActiveByUserId('u1');
    expect(cart?.status).toBe(CartStatus.Active);
    expect(outboxRepo.events).toHaveLength(0);
  });
});
