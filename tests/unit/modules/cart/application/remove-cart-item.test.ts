import { describe, it, expect, beforeEach } from 'vitest';
import { RemoveCartItem } from '@/modules/cart/application/remove-cart-item';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { CartId } from '@/modules/cart/domain/value-objects/cart-id';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import {
  ItemNotFoundError,
  ForbiddenError,
  CartImmutableError,
} from '@/modules/cart/domain/errors';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';

/**
 * Tests for RemoveCartItem (spec REQ-CART-013).
 *
 * Coverage:
 *  - Happy path: removes the item, cart stays ACTIVE, emits CartItemRemoved
 *  - Removing the last item leaves an empty active cart
 *  - Removing from an empty cart (no matching item) → ItemNotFoundError
 *  - Cross-user removal rejected with ForbiddenError
 *  - Removal from checked-out cart rejected with CartImmutableError
 */
describe('RemoveCartItem', () => {
  let cartRepo: MemoryCartRepository;
  let outboxRepo: MemoryOutboxRepository;
  let useCase: RemoveCartItem;

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

  beforeEach(async () => {
    cartRepo = new MemoryCartRepository();
    outboxRepo = new MemoryOutboxRepository();
    useCase = new RemoveCartItem(cartRepo, outboxRepo);
  });

  // -------------------------------------------------------------------------
  // Happy paths
  // -------------------------------------------------------------------------

  it('removes the item and emits CartItemRemoved, keeping the cart ACTIVE', async () => {
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({ id: 'i1', cartId: 'c1' }),
          makeItem({ id: 'i2', cartId: 'c1' }),
        ],
      }),
    );

    await useCase.execute({ userId: 'u1', itemId: 'i1' });

    const cart = await cartRepo.findActiveByUserId('u1');
    expect(cart).not.toBeNull();
    expect(cart?.status).toBe(CartStatus.Active);
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].id).toBe('i2');

    expect(outboxRepo.events).toHaveLength(1);
    expect(outboxRepo.events[0].eventType).toBe(GlobalEvents.CART_ITEM_REMOVED);
    const payload = outboxRepo.events[0].payload as {
      cartId: string;
      itemId: string;
    };
    expect(payload.cartId).toBe('c1');
    expect(payload.itemId).toBe('i1');
  });

  it('removing the last item leaves an empty active cart', async () => {
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    await useCase.execute({ userId: 'u1', itemId: 'i1' });

    const cart = await cartRepo.findActiveByUserId('u1');
    expect(cart).not.toBeNull();
    expect(cart?.status).toBe(CartStatus.Active);
    expect(cart?.items).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Errors
  // -------------------------------------------------------------------------

  it('rejects unknown itemId with ItemNotFoundError', async () => {
    await cartRepo.save(makeCart({ id: 'c1', userId: 'u1', items: [] }));

    await expect(
      useCase.execute({ userId: 'u1', itemId: 'missing' }),
    ).rejects.toBeInstanceOf(ItemNotFoundError);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('rejects cross-user removal with ForbiddenError', async () => {
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    await expect(
      useCase.execute({ userId: 'u-other', itemId: 'i1' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('rejects removal from a checked-out cart with CartImmutableError', async () => {
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );
    await cartRepo.markCheckedOut(CartId.create('c1'));

    await expect(
      useCase.execute({ userId: 'u1', itemId: 'i1' }),
    ).rejects.toBeInstanceOf(CartImmutableError);
    expect(outboxRepo.events).toHaveLength(0);
  });
});
