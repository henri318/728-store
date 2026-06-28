import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateCartItemQuantity } from '@/modules/cart/application/update-cart-item';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import {
  ItemNotFoundError,
  InvalidQuantityError,
  ForbiddenError,
  CartImmutableError,
} from '@/modules/cart/domain/errors';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';

/**
 * Tests for UpdateCartItemQuantity (spec REQ-CART-012).
 *
 * Coverage:
 *  - Happy path: update quantity, emit CartItemUpdated
 *  - Increase and decrease
 *  - Cross-user update rejected with ForbiddenError
 *  - Update on checked-out cart rejected with CartImmutableError
 *  - Invalid quantity rejected
 *  - Unknown itemId rejected with ItemNotFoundError
 */
describe('UpdateCartItemQuantity', () => {
  let cartRepo: MemoryCartRepository;
  let outboxRepo: MemoryOutboxRepository;
  let useCase: UpdateCartItemQuantity;

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
    useCase = new UpdateCartItemQuantity(cartRepo, outboxRepo);

    // Seed a basic active cart with one item.
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1', quantity: 2 })],
      }),
    );
  });

  // -------------------------------------------------------------------------
  // Happy paths
  // -------------------------------------------------------------------------

  it('updates the item quantity and emits CartItemUpdated', async () => {
    const item = await useCase.execute({
      userId: 'u1',
      itemId: 'i1',
      quantity: 5,
    });

    expect(item.quantity).toBe(5);

    const cart = await cartRepo.findActiveByUserId('u1');
    expect(cart?.items[0].quantity).toBe(5);

    expect(outboxRepo.events).toHaveLength(1);
    expect(outboxRepo.events[0].eventType).toBe(GlobalEvents.CART_ITEM_UPDATED);
    const payload = outboxRepo.events[0].payload as {
      cartId: string;
      itemId: string;
      quantity: number;
    };
    expect(payload.cartId).toBe('c1');
    expect(payload.itemId).toBe('i1');
    expect(payload.quantity).toBe(5);
  });

  it('decreases quantity', async () => {
    const item = await useCase.execute({
      userId: 'u1',
      itemId: 'i1',
      quantity: 1,
    });
    expect(item.quantity).toBe(1);
  });

  it('keeps the snapshot (price does not change on update)', async () => {
    const item = await useCase.execute({
      userId: 'u1',
      itemId: 'i1',
      quantity: 7,
    });
    expect(item.unitPriceSnapshot.amount).toBe(10);
    expect(item.unitPriceSnapshot.currency).toBe(Currency.EUR);
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it('rejects quantity = 0 with InvalidQuantityError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', itemId: 'i1', quantity: 0 }),
    ).rejects.toBeInstanceOf(InvalidQuantityError);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('rejects quantity = 100 with InvalidQuantityError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', itemId: 'i1', quantity: 100 }),
    ).rejects.toBeInstanceOf(InvalidQuantityError);
  });

  it('rejects unknown itemId with ItemNotFoundError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', itemId: 'missing', quantity: 1 }),
    ).rejects.toBeInstanceOf(ItemNotFoundError);
    expect(outboxRepo.events).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Auth + state guards
  // -------------------------------------------------------------------------

  it('rejects cross-user update with ForbiddenError', async () => {
    await expect(
      useCase.execute({ userId: 'u-other', itemId: 'i1', quantity: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('rejects update on a checked-out cart with CartImmutableError', async () => {
    // Mark the cart as checked out.
    await cartRepo.markCheckedOut(
      await import('@/modules/cart/domain/value-objects/cart-id').then((m) =>
        m.CartId.create('c1'),
      ),
    );

    await expect(
      useCase.execute({ userId: 'u1', itemId: 'i1', quantity: 5 }),
    ).rejects.toBeInstanceOf(CartImmutableError);
    expect(outboxRepo.events).toHaveLength(0);
  });
});
