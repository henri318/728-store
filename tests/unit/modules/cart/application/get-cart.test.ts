import { describe, it, expect, beforeEach } from 'vitest';
import { GetCart } from '@/modules/cart/application/get-cart';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';

/**
 * Tests for GetCart (simple query use case, spec REQ-CART-014 / API GET /api/cart).
 *
 * Coverage:
 *  - Returns the user's ACTIVE cart with hydrated items
 *  - Returns an empty cart shape (status=ACTIVE, items=[]) when no active cart
 *  - Does NOT return CHECKED_OUT carts
 *  - Read-only — no events emitted
 */
describe('GetCart', () => {
  let cartRepo: MemoryCartRepository;
  let useCase: GetCart;

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
    useCase = new GetCart(cartRepo);
  });

  it('returns the user ACTIVE cart with items', async () => {
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    const cart = await useCase.execute('u1');
    expect(cart).not.toBeNull();
    expect(cart?.id).toBe('c1');
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].id).toBe('i1');
  });

  it('returns an empty ACTIVE shape when the user has no cart', async () => {
    const cart = await useCase.execute('u1');
    expect(cart).not.toBeNull();
    expect(cart?.status).toBe(CartStatus.Active);
    expect(cart?.items).toEqual([]);
  });

  it('does not return a CHECKED_OUT cart', async () => {
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        status: CartStatus.CheckedOut,
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    const cart = await useCase.execute('u1');
    expect(cart).not.toBeNull();
    expect(cart?.items).toEqual([]);
    expect(cart?.status).toBe(CartStatus.Active);
  });
});
