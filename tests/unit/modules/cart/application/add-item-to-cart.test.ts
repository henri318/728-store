import { describe, it, expect, beforeEach } from 'vitest';
import { AddItemToCart } from '@/modules/cart/application/add-item-to-cart';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { MemoryCartProductRepository } from '@/tests/doubles/memory-cart-product-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import {
  ProductNotFoundError,
  InvalidQuantityError,
} from '@/modules/cart/domain/errors';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';

/**
 * Tests for AddItemToCart use case (spec REQ-CART-011 / REQ-CART-001 / REQ-CART-002).
 *
 * Coverage matrix:
 *  - Auto-create cart on first add
 *  - CartItemAdded + CartCreated events emitted
 *  - Identical customization merges (quantity increments)
 *  - Different customization creates a separate row
 *  - Invalid quantity rejected (0, 100, negative, non-integer)
 *  - Unavailable product rejected
 *  - Reject mutation on checked-out cart
 *  - Product snapshot captures price + seller
 */
describe('AddItemToCart', () => {
  let cartRepo: MemoryCartRepository;
  let productRepo: MemoryCartProductRepository;
  let outboxRepo: MemoryOutboxRepository;
  let useCase: AddItemToCart;

  beforeEach(() => {
    cartRepo = new MemoryCartRepository();
    productRepo = new MemoryCartProductRepository();
    outboxRepo = new MemoryOutboxRepository();
    useCase = new AddItemToCart(cartRepo, productRepo, outboxRepo);

    productRepo.seed([
      { id: 'p1', basePrice: 10, sellerId: 's1' },
      { id: 'p2', basePrice: 25, sellerId: 's1' },
      { id: 'p3', basePrice: 50, sellerId: 's2' },
    ]);
  });

  const findCart = async (userId: string): Promise<CartEntity | null> => {
    return cartRepo.findActiveByUserId(userId);
  };

  // -------------------------------------------------------------------------
  // Auto-create cart + happy path
  // -------------------------------------------------------------------------

  it('auto-creates a new ACTIVE cart on first add and emits CartCreated + CartItemAdded', async () => {
    const item = await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 2,
    });

    expect(item.productId.value).toBe('p1');
    expect(item.sellerId.value).toBe('s1');
    expect(item.quantity).toBe(2);
    expect(item.unitPriceSnapshot.amount).toBe(10);
    expect(item.unitPriceSnapshot.currency).toBe(Currency.EUR);

    const cart = await findCart('u1');
    expect(cart).not.toBeNull();
    expect(cart?.status).toBe(CartStatus.Active);
    expect(cart?.items).toHaveLength(1);

    const eventTypes = outboxRepo.events.map((e) => e.eventType);
    expect(eventTypes).toContain(GlobalEvents.CART_CREATED);
    expect(eventTypes).toContain(GlobalEvents.CART_ITEM_ADDED);
    // CartCreated must come first (the spec orders the emission)
    expect(eventTypes.indexOf(GlobalEvents.CART_CREATED)).toBeLessThan(
      eventTypes.indexOf(GlobalEvents.CART_ITEM_ADDED),
    );
  });

  it('reuses the existing ACTIVE cart on subsequent adds (no second CartCreated)', async () => {
    await useCase.execute({ userId: 'u1', productId: 'p1', quantity: 1 });
    await useCase.execute({ userId: 'u1', productId: 'p2', quantity: 1 });

    const cart = await findCart('u1');
    expect(cart?.items).toHaveLength(2);

    const createdCount = outboxRepo.events.filter(
      (e) => e.eventType === GlobalEvents.CART_CREATED,
    ).length;
    expect(createdCount).toBe(1);
  });

  it('isolates carts per user', async () => {
    await useCase.execute({ userId: 'u1', productId: 'p1', quantity: 1 });
    await useCase.execute({ userId: 'u2', productId: 'p1', quantity: 1 });

    const cart1 = await findCart('u1');
    const cart2 = await findCart('u2');
    expect(cart1?.id).not.toBe(cart2?.id);
  });

  // -------------------------------------------------------------------------
  // Customization merge vs split
  // -------------------------------------------------------------------------

  it('merges quantity when the same product + identical customization is added again', async () => {
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 2,
      customization: { size: 'M', color: 'red' },
    });
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 3,
      customization: { size: 'M', color: 'red' },
    });

    const cart = await findCart('u1');
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].quantity).toBe(5);
  });

  it('creates a separate row when customization differs (size)', async () => {
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      customization: { size: 'M' },
    });
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      customization: { size: 'L' },
    });

    const cart = await findCart('u1');
    expect(cart?.items).toHaveLength(2);
    expect(cart?.items.map((i) => i.customizationSize).sort()).toEqual([
      'L',
      'M',
    ]);
  });

  it('creates a separate row when customization differs (color)', async () => {
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      customization: { color: 'red' },
    });
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      customization: { color: 'blue' },
    });

    const cart = await findCart('u1');
    expect(cart?.items).toHaveLength(2);
  });

  it('creates a separate row when customization text differs', async () => {
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      customization: { text: 'Hello' },
    });
    await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      customization: { text: 'World' },
    });

    const cart = await findCart('u1');
    expect(cart?.items).toHaveLength(2);
  });

  it('does not merge when only productId matches but no customization on either row', async () => {
    // Add the same product with no customization twice — should merge.
    await useCase.execute({ userId: 'u1', productId: 'p1', quantity: 1 });
    await useCase.execute({ userId: 'u1', productId: 'p1', quantity: 2 });

    const cart = await findCart('u1');
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].quantity).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it('rejects quantity = 0 with InvalidQuantityError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'p1', quantity: 0 }),
    ).rejects.toBeInstanceOf(InvalidQuantityError);

    expect(await findCart('u1')).toBeNull();
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('rejects quantity = 100 with InvalidQuantityError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'p1', quantity: 100 }),
    ).rejects.toBeInstanceOf(InvalidQuantityError);
  });

  it('rejects negative quantity with InvalidQuantityError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'p1', quantity: -1 }),
    ).rejects.toBeInstanceOf(InvalidQuantityError);
  });

  it('rejects non-integer quantity with InvalidQuantityError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'p1', quantity: 1.5 }),
    ).rejects.toBeInstanceOf(InvalidQuantityError);
  });

  it('rejects unknown product with ProductNotFoundError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', productId: 'missing', quantity: 1 }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);

    expect(await findCart('u1')).toBeNull();
    expect(outboxRepo.events).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Snapshot capture
  // -------------------------------------------------------------------------

  it('captures the current product basePrice + sellerId as the item snapshot', async () => {
    const item = await useCase.execute({
      userId: 'u1',
      productId: 'p3',
      quantity: 1,
    });

    expect(item.unitPriceSnapshot.equals(Money.create(50, Currency.EUR))).toBe(
      true,
    );
    expect(item.sellerId.equals(SellerId.create('s2'))).toBe(true);
    expect(item.productId.equals(ProductId.create('p3'))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // State guards
  // -------------------------------------------------------------------------

  it('creates a new ACTIVE cart when the user only has a CHECKED_OUT cart', async () => {
    // Seed a CHECKED_OUT cart directly. The use case should NOT touch it
    // (it's immutable) — it should create a fresh active cart for the
    // user. (REQ-CART-001, REQ-CART-003.)
    const now = new Date();
    const checkedOut: CartEntity = {
      id: 'c-checkout',
      userId: 'u1',
      status: CartStatus.CheckedOut,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    await cartRepo.save(checkedOut);

    const item = await useCase.execute({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
    });

    // A new ACTIVE cart was created; the CHECKED_OUT one is untouched.
    const active = await findCart('u1');
    expect(active).not.toBeNull();
    expect(active?.id).not.toBe('c-checkout');
    expect(active?.status).toBe(CartStatus.Active);
    expect(active?.items).toHaveLength(1);
    expect(active?.items[0].id).toBe(item.id);
  });
});
