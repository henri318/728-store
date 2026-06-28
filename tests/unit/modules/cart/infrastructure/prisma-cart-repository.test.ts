import { Prisma } from '@prisma/client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — the PrismaCartRepository depends on the prisma client. We mock
// the client so the test runs in-memory. The mock state must be hoisted
// so the vi.mock factory (which vitest hoists to the top) can reference
// it before the import statements run.
// ---------------------------------------------------------------------------

const { cartStore, itemStore, prismaMock } = vi.hoisted(() => {
  const cartStore: Array<{
    id: string;
    userId: string;
    status: 'ACTIVE' | 'CHECKED_OUT';
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const itemStore: Array<{
    id: string;
    cartId: string;
    productId: string;
    sellerId: string;
    quantity: number;
    unitPriceSnapshot: { toNumber: () => number } | number;
    customizationText: string | null;
    customizationColor: string | null;
    customizationSize: string | null;
    customizationImageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const prismaMock = {
    cart: {
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { id?: string; userId?: string; status?: string };
        }) => {
          const found = cartStore.find(
            (c) =>
              (!where.id || c.id === where.id) &&
              (!where.userId || c.userId === where.userId) &&
              (!where.status || c.status === where.status),
          );
          if (!found) return null;
          return {
            ...found,
            items: itemStore.filter((i) => i.cartId === found.id),
          };
        },
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const found = cartStore.find((c) => c.id === where.id);
        if (!found) return null;
        return {
          ...found,
          items: itemStore.filter((i) => i.cartId === found.id),
        };
      }),
      upsert: vi.fn(
        async ({
          where,
          update,
          create,
        }: {
          where: { id: string };
          update: Record<string, unknown>;
          create: Record<string, unknown>;
        }) => {
          const existing = cartStore.find((c) => c.id === where.id);
          if (existing) {
            Object.assign(existing, update, { updatedAt: new Date() });
            return {
              ...existing,
              items: itemStore.filter((i) => i.cartId === existing.id),
            };
          }
          // Simulate the partial unique index `Cart_userId_active_unique`:
          // if the new row is ACTIVE and the user already has a different
          // ACTIVE cart, throw a Prisma P2002 unique-constraint error.
          const newStatus = create.status as 'ACTIVE' | 'CHECKED_OUT';
          if (newStatus === 'ACTIVE') {
            const conflict = cartStore.find(
              (c) =>
                c.userId === (create.userId as string) &&
                c.status === 'ACTIVE' &&
                c.id !== where.id,
            );
            if (conflict) {
              throw new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed on Cart_userId_active_unique',
                { code: 'P2002', clientVersion: 'mock' },
              );
            }
          }
          const row = {
            id: create.id as string,
            userId: create.userId as string,
            status: newStatus,
            createdAt: (create.createdAt as Date) ?? new Date(),
            updatedAt: (create.updatedAt as Date) ?? new Date(),
          };
          cartStore.push(row);
          return { ...row, items: [] };
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const idx = cartStore.findIndex((c) => c.id === where.id);
          if (idx < 0) throw new Error('Cart not found');
          cartStore[idx] = {
            ...cartStore[idx],
            ...(data as Partial<(typeof cartStore)[number]>),
            updatedAt: new Date(),
          };
          return {
            ...cartStore[idx],
            items: itemStore.filter((i) => i.cartId === cartStore[idx].id),
          };
        },
      ),
    },
    cartItem: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const found = itemStore.find((i) => i.id === where.id);
        return found ? { ...found } : null;
      }),
      findMany: vi.fn(async ({ where }: { where: { cartId?: string } }) => {
        return itemStore
          .filter((i) => !where.cartId || i.cartId === where.cartId)
          .map((i) => ({ ...i }));
      }),
      createMany: vi.fn(
        async ({ data }: { data: Array<Record<string, unknown>> }) => {
          for (const d of data) {
            itemStore.push({
              id: d.id as string,
              cartId: d.cartId as string,
              productId: d.productId as string,
              sellerId: d.sellerId as string,
              quantity: d.quantity as number,
              unitPriceSnapshot: d.unitPriceSnapshot as {
                toNumber: () => number;
              },
              customizationText: (d.customizationText as string | null) ?? null,
              customizationColor:
                (d.customizationColor as string | null) ?? null,
              customizationSize: (d.customizationSize as string | null) ?? null,
              customizationImageUrl:
                (d.customizationImageUrl as string | null) ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return { count: data.length };
        },
      ),
      deleteMany: vi.fn(
        async ({ where }: { where: { id?: string; cartId?: string } }) => {
          const before = itemStore.length;
          const filtered = itemStore.filter(
            (i) =>
              (!where.id || i.id !== where.id) &&
              (!where.cartId || i.cartId !== where.cartId),
          );
          itemStore.length = 0;
          itemStore.push(...filtered);
          return { count: before - itemStore.length };
        },
      ),
    },
    $transaction: vi.fn(
      async <T>(work: (tx: typeof prismaMock) => Promise<T>): Promise<T> =>
        work(prismaMock),
    ),
  };

  return { cartStore, itemStore, prismaMock };
});

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: prismaMock,
}));

// Imports must come AFTER the mock.
import { PrismaCartRepository } from '@/modules/cart/infrastructure/prisma-cart-repository';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { CartId } from '@/modules/cart/domain/value-objects/cart-id';
import { CartItemId } from '@/modules/cart/domain/value-objects/cart-item-id';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { CartAlreadyActiveError } from '@/modules/cart/domain/errors';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';

/**
 * Tests for the PrismaCartRepository adapter.
 *
 * The Prisma client is mocked so the test runs in-memory. The
 * repository is the seam between the Cart domain (value objects) and
 * Prisma (raw primitives + Decimal). These tests cover:
 *  - findActiveByUserId returns a hydrated cart with Money VOs
 *  - findById returns a cart with Money VOs
 *  - save persists the cart + its items; converts Money → Decimal
 *  - save enforces "one ACTIVE cart per user" via the partial unique
 *    index simulated by the mock (we throw CartAlreadyActiveError)
 *  - markCheckedOut flips status to CHECKED_OUT
 *  - deleteItem removes the item
 *  - findItemById returns the item with Money VOs
 *  - findItemsByCartId returns the items for a cart
 */
describe('PrismaCartRepository', () => {
  let repo: PrismaCartRepository;

  beforeEach(() => {
    cartStore.length = 0;
    itemStore.length = 0;
    vi.clearAllMocks();
    repo = new PrismaCartRepository();
  });

  const makeItem = (
    overrides: Partial<{
      id: string;
      cartId: string;
      productId: string;
      sellerId: string;
      quantity: number;
      unitPriceSnapshot: Money;
      customizationIdList: string[];
    }> = {},
  ): import('@/modules/cart/domain/entities/cart-item').CartItemEntity => ({
    id: overrides.id ?? 'i1',
    cartId: overrides.cartId ?? 'c1',
    productId: ProductId.create(overrides.productId ?? 'p1'),
    sellerId: SellerId.create(overrides.sellerId ?? 's1'),
    quantity: overrides.quantity ?? 1,
    unitPriceSnapshot:
      overrides.unitPriceSnapshot ?? Money.create(10, Currency.EUR),
    customizationIdList: overrides.customizationIdList ?? [],
  });

  const makeCart = (overrides: Partial<CartEntity> = {}): CartEntity => {
    const now = new Date('2026-01-01T00:00:00Z');
    return {
      id: overrides.id ?? 'c1',
      userId: overrides.userId ?? 'u1',
      status: overrides.status ?? CartStatus.Active,
      items: overrides.items ?? [],
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    };
  };

  // -------------------------------------------------------------------------
  // findActiveByUserId
  // -------------------------------------------------------------------------

  it('findActiveByUserId returns null when no cart exists', async () => {
    const cart = await repo.findActiveByUserId('u1');
    expect(cart).toBeNull();
  });

  it('findActiveByUserId returns a hydrated cart with Money VOs', async () => {
    const cart = makeCart({
      id: 'c1',
      userId: 'u1',
      items: [
        makeItem({
          id: 'i1',
          cartId: 'c1',
          unitPriceSnapshot: Money.create(12, Currency.EUR),
        }),
      ],
    });
    await repo.save(cart);

    const found = await repo.findActiveByUserId('u1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('c1');
    expect(found?.status).toBe(CartStatus.Active);
    expect(found?.items).toHaveLength(1);
    expect(found?.items[0].unitPriceSnapshot.amount).toBe(12);
    expect(found?.items[0].unitPriceSnapshot.currency).toBe(Currency.EUR);
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  it('findById returns null when the cart does not exist', async () => {
    const found = await repo.findById(CartId.create('missing'));
    expect(found).toBeNull();
  });

  it('findById returns a cart with status preserved', async () => {
    await repo.save(makeCart({ id: 'c1', userId: 'u1' }));
    await repo.markCheckedOut(CartId.create('c1'));

    const found = await repo.findById(CartId.create('c1'));
    expect(found?.status).toBe(CartStatus.CheckedOut);
  });

  // -------------------------------------------------------------------------
  // save
  // -------------------------------------------------------------------------

  it('save persists a new cart and its items', async () => {
    const cart = makeCart({
      id: 'c1',
      userId: 'u1',
      items: [makeItem({ id: 'i1', cartId: 'c1' })],
    });
    await repo.save(cart);

    const found = await repo.findById(CartId.create('c1'));
    expect(found?.items).toHaveLength(1);
    expect(found?.items[0].id).toBe('i1');
  });

  it('save rejects a second ACTIVE cart for the same user', async () => {
    await repo.save(makeCart({ id: 'c1', userId: 'u1' }));

    await expect(
      repo.save(makeCart({ id: 'c2', userId: 'u1' })),
    ).rejects.toBeInstanceOf(CartAlreadyActiveError);
  });

  // -------------------------------------------------------------------------
  // markCheckedOut
  // -------------------------------------------------------------------------

  it('markCheckedOut flips the cart status to CHECKED_OUT', async () => {
    await repo.save(makeCart({ id: 'c1', userId: 'u1' }));
    await repo.markCheckedOut(CartId.create('c1'));

    const found = await repo.findById(CartId.create('c1'));
    expect(found?.status).toBe(CartStatus.CheckedOut);
  });

  it('markCheckedOut is a no-op for a missing cart', async () => {
    await expect(
      repo.markCheckedOut(CartId.create('missing')),
    ).resolves.toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // deleteItem
  // -------------------------------------------------------------------------

  it('deleteItem removes the item from the cart', async () => {
    await repo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({ id: 'i1', cartId: 'c1' }),
          makeItem({ id: 'i2', cartId: 'c1' }),
        ],
      }),
    );

    await repo.deleteItem(CartItemId.create('i1'));

    const items = await repo.findItemsByCartId(CartId.create('c1'));
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('i2');
  });

  // -------------------------------------------------------------------------
  // findItemById
  // -------------------------------------------------------------------------

  it('findItemById returns the item with Money VO', async () => {
    await repo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'i1',
            cartId: 'c1',
            unitPriceSnapshot: Money.create(7, Currency.EUR),
          }),
        ],
      }),
    );

    const item = await repo.findItemById(CartItemId.create('i1'));
    expect(item?.id).toBe('i1');
    expect(item?.unitPriceSnapshot.amount).toBe(7);
  });

  it('findItemById returns null when the item is missing', async () => {
    expect(await repo.findItemById(CartItemId.create('missing'))).toBeNull();
  });

  // -------------------------------------------------------------------------
  // findItemsByCartId
  // -------------------------------------------------------------------------

  it('findItemsByCartId returns all items for a cart', async () => {
    await repo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({ id: 'i1', cartId: 'c1' }),
          makeItem({ id: 'i2', cartId: 'c1' }),
        ],
      }),
    );

    const items = await repo.findItemsByCartId(CartId.create('c1'));
    expect(items).toHaveLength(2);
  });
});
