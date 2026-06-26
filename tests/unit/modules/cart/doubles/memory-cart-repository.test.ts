import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';

/**
 * Task 1.x — MemoryCartRepository integration test.
 *
 * Verifies the in-memory implementation of CartRepository honors the port
 * contract:
 * - findActiveByUserId returns null when no cart exists
 * - findActiveByUserId returns the latest ACTIVE cart with hydrated items
 * - findActiveByUserId does NOT return CHECKED_OUT carts
 * - save persists a new cart and returns the stored entity
 * - save overwrites an existing cart when its id already exists
 * - markCheckedOut flips status to CHECKED_OUT
 * - deleteItem removes only the matching item
 * - findItemById returns the item or null
 * - findItemsByCartId returns all items for a cart (even after one is deleted)
 *
 * This is the primary adapter for use case tests until PrismaCartRepository
 * lands in Phase 2.
 */
const makeItem = (overrides: Partial<CartItemEntity> = {}): CartItemEntity => ({
  id: 'item-default',
  cartId: 'cart-default',
  productId: 'p1',
  sellerId: 's1',
  quantity: 1,
  unitPriceSnapshot: Money.create(10, Currency.EUR),
  ...overrides,
});

const makeCart = (overrides: Partial<CartEntity> = {}): CartEntity => ({
  id: 'cart-default',
  userId: 'user-1',
  status: CartStatus.Active,
  items: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('MemoryCartRepository', () => {
  let repo: MemoryCartRepository;

  beforeEach(() => {
    repo = new MemoryCartRepository();
  });

  describe('findActiveByUserId()', () => {
    it('returns null when the user has no cart', async () => {
      const cart = await repo.findActiveByUserId('user-1');
      expect(cart).toBeNull();
    });

    it('returns the ACTIVE cart for the user', async () => {
      const cart = makeCart({ id: 'cart-1', userId: 'user-1' });
      await repo.save(cart);

      const found = await repo.findActiveByUserId('user-1');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('cart-1');
      expect(found?.status).toBe(CartStatus.Active);
    });

    it('does NOT return a CHECKED_OUT cart', async () => {
      const cart = makeCart({
        id: 'cart-1',
        userId: 'user-1',
        status: CartStatus.CheckedOut,
      });
      await repo.save(cart);

      const found = await repo.findActiveByUserId('user-1');
      expect(found).toBeNull();
    });

    it('hydrates the cart with its items', async () => {
      const item = makeItem({ id: 'i1', cartId: 'cart-1' });
      const cart = makeCart({ id: 'cart-1', userId: 'user-1', items: [item] });
      await repo.save(cart);

      const found = await repo.findActiveByUserId('user-1');
      expect(found?.items).toHaveLength(1);
      expect(found?.items[0].id).toBe('i1');
    });

    it('returns only the cart matching the userId', async () => {
      await repo.save(makeCart({ id: 'cart-1', userId: 'user-1' }));
      await repo.save(makeCart({ id: 'cart-2', userId: 'user-2' }));

      const found = await repo.findActiveByUserId('user-1');
      expect(found?.id).toBe('cart-1');
    });
  });

  describe('save()', () => {
    it('persists a new cart', async () => {
      const cart = makeCart({ id: 'cart-1', userId: 'user-1' });
      const saved = await repo.save(cart);

      expect(saved.id).toBe('cart-1');
      const found = await repo.findActiveByUserId('user-1');
      expect(found?.id).toBe('cart-1');
    });

    it('persists cart items with the cart', async () => {
      const item = makeItem({ id: 'i1', cartId: 'cart-1' });
      const cart = makeCart({ id: 'cart-1', userId: 'user-1', items: [item] });
      await repo.save(cart);

      const items = await repo.findItemsByCartId('cart-1');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('i1');
    });

    it('replaces an existing cart when the same id is saved', async () => {
      await repo.save(makeCart({ id: 'cart-1', userId: 'user-1' }));
      const replacement = makeCart({
        id: 'cart-1',
        userId: 'user-1',
        status: CartStatus.CheckedOut,
      });
      await repo.save(replacement);

      const found = await repo.findActiveByUserId('user-1');
      expect(found).toBeNull();
    });
  });

  describe('markCheckedOut()', () => {
    it('flips the cart status to CHECKED_OUT', async () => {
      const item = makeItem({ id: 'i1', cartId: 'cart-1' });
      await repo.save(
        makeCart({ id: 'cart-1', userId: 'user-1', items: [item] }),
      );
      await repo.markCheckedOut('cart-1');

      const found = await repo.findActiveByUserId('user-1');
      expect(found).toBeNull();

      const stored = await repo.findById('cart-1');
      expect(stored?.status).toBe(CartStatus.CheckedOut);
      expect(stored?.items[0].id).toBe('i1');
    });

    it('is a no-op for a non-existent cart (no throw)', async () => {
      await expect(repo.markCheckedOut('missing')).resolves.toBeUndefined();
    });
  });

  describe('deleteItem()', () => {
    it('removes the matching item', async () => {
      const item1 = makeItem({ id: 'i1', cartId: 'cart-1' });
      const item2 = makeItem({ id: 'i2', cartId: 'cart-1' });
      await repo.save(
        makeCart({ id: 'cart-1', userId: 'user-1', items: [item1, item2] }),
      );

      await repo.deleteItem('i1');

      const items = await repo.findItemsByCartId('cart-1');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('i2');
    });

    it('is a no-op for a non-existent item id', async () => {
      const item = makeItem({ id: 'i1', cartId: 'cart-1' });
      await repo.save(
        makeCart({ id: 'cart-1', userId: 'user-1', items: [item] }),
      );

      await expect(repo.deleteItem('missing')).resolves.toBeUndefined();

      const items = await repo.findItemsByCartId('cart-1');
      expect(items).toHaveLength(1);
    });
  });

  describe('findItemById()', () => {
    it('returns the matching item', async () => {
      const item = makeItem({ id: 'i1', cartId: 'cart-1' });
      await repo.save(
        makeCart({ id: 'cart-1', userId: 'user-1', items: [item] }),
      );

      const found = await repo.findItemById('i1');
      expect(found?.id).toBe('i1');
      expect(found?.cartId).toBe('cart-1');
    });

    it('returns null when the item does not exist', async () => {
      const found = await repo.findItemById('missing');
      expect(found).toBeNull();
    });
  });

  describe('findItemsByCartId()', () => {
    it('returns all items belonging to a cart', async () => {
      const item1 = makeItem({ id: 'i1', cartId: 'cart-1' });
      const item2 = makeItem({ id: 'i2', cartId: 'cart-1' });
      const other = makeItem({ id: 'i3', cartId: 'cart-2' });
      await repo.save(
        makeCart({ id: 'cart-1', userId: 'user-1', items: [item1, item2] }),
      );
      await repo.save(
        makeCart({ id: 'cart-2', userId: 'user-2', items: [other] }),
      );

      const items = await repo.findItemsByCartId('cart-1');
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.id).sort()).toEqual(['i1', 'i2']);
    });

    it('returns an empty array when the cart has no items', async () => {
      const items = await repo.findItemsByCartId('missing-cart');
      expect(items).toEqual([]);
    });
  });
});
