import { describe, it, expect, beforeEach } from 'vitest';
import { MigrateGuestCart } from '@/modules/cart/application/migrate-guest-cart';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { MemoryCartProductRepository } from '@/tests/doubles/memory-cart-product-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryCustomizationLookup } from '@/tests/doubles/memory-customization-lookup';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import type { CartEntity } from '@/modules/cart/domain/entities/cart';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';
import type { ProductCapabilityPort } from '@/modules/products/domain/product-capability-port';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import type { CustomizationCreatePort } from '@/modules/cart/domain/customization-create-port';

/**
 * Tests for MigrateGuestCart (spec REQ-CART-020 / REQ-CART-033).
 *
 * The use case receives a snapshot of the guest cart (from localStorage)
 * and merges it into the user's server cart according to a strategy.
 *
 * Coverage:
 *  - Empty guest cart on login: server cart is loaded as-is (no migration)
 *  - Guest cart has items, no server cart: creates new server cart
 *  - Merge: combines items, merging duplicates by product+customization
 *  - Keep-server: server cart unchanged
 *  - Keep-guest: server cart replaced with guest items
 *  - Unavailable products: filtered out
 *  - Current prices are used (guest snapshot is discarded)
 *  - Emits GuestCartMigrated
 *  - Returns migratedCount of items actually used
 */
describe('MigrateGuestCart', () => {
  let cartRepo: MemoryCartRepository;
  let productRepo: MemoryCartProductRepository;
  let outboxRepo: MemoryOutboxRepository;
  let customizationLookup: MemoryCustomizationLookup;
  let capabilityPort: ProductCapabilityPort;
  let customizationCreator: CustomizationCreatePort;
  let useCase: MigrateGuestCart;

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
    customizationLookup = new MemoryCustomizationLookup();
    capabilityPort = {
      async getConfig() {
        return ProductCustomizationConfig.default();
      },
    };
    customizationCreator = {
      async create(input) {
        return {
          id: `created-${input.productId}-${input.text ?? input.imageUrl ?? 'x'}`,
          productId: input.productId,
          text: input.text ?? null,
          color: input.color ?? null,
          size: input.size ?? null,
          imageUrl: input.imageUrl ?? null,
        };
      },
    };
    useCase = new MigrateGuestCart(
      cartRepo,
      productRepo,
      outboxRepo,
      customizationLookup,
      capabilityPort,
      customizationCreator,
    );
  });

  // -------------------------------------------------------------------------
  // Empty guest cart
  // -------------------------------------------------------------------------

  it('empty guest cart on login: returns server cart as-is, no migration event', async () => {
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'i1', cartId: 'c1' })],
      }),
    );

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [],
      strategy: 'merge',
    });

    expect(result.cart.id).toBe('c1');
    expect(result.cart.items).toHaveLength(1);
    expect(result.migratedCount).toBe(0);
    expect(outboxRepo.events).toHaveLength(0);
  });

  it('empty guest cart AND no server cart: returns a fresh empty cart', async () => {
    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [],
      strategy: 'merge',
    });

    expect(result.cart.status).toBe(CartStatus.Active);
    expect(result.cart.items).toHaveLength(0);
    expect(result.migratedCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // No server cart + guest items → create new server cart
  // -------------------------------------------------------------------------

  it('guest items, no server cart: creates new server cart with the guest items', async () => {
    productRepo.seed([
      { id: 'p1', basePrice: 12, sellerId: 's1' },
      { id: 'p2', basePrice: 20, sellerId: 's1' },
    ]);

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 2,
          unitPriceSnapshot: 10, // guest snapshot — discarded
        },
        {
          productId: 'p2',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 20,
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.id).not.toBe('');
    expect(result.cart.items).toHaveLength(2);
    expect(result.migratedCount).toBe(2);

    // Current price is used (not the guest snapshot)
    const item1 = result.cart.items.find((i) => i.productId.value === 'p1');
    expect(item1?.unitPriceSnapshot.amount).toBe(12);
    expect(item1?.quantity).toBe(2);

    // CartCreated + CartItemAdded events for each item
    const eventTypes = outboxRepo.events.map((e) => e.eventType);
    expect(eventTypes).toContain(GlobalEvents.CART_CREATED);
    expect(
      eventTypes.filter((t) => t === GlobalEvents.CART_ITEM_ADDED),
    ).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // Merge strategy
  // -------------------------------------------------------------------------

  it('merge strategy: combines server + guest items, merging duplicates by product+customization', async () => {
    productRepo.seed([
      { id: 'p1', basePrice: 12, sellerId: 's1' },
      { id: 'p2', basePrice: 25, sellerId: 's2' },
    ]);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'server-i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            sellerId: SellerId.create('s1'),
            quantity: 2,
            unitPriceSnapshot: Money.create(12, Currency.EUR),
          }),
          makeItem({
            id: 'server-i2',
            cartId: 'c1',
            productId: ProductId.create('p2'),
            sellerId: SellerId.create('s2'),
            quantity: 1,
            unitPriceSnapshot: Money.create(25, Currency.EUR),
          }),
        ],
      }),
    );

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        // Duplicate of server p1: should merge into the existing row.
        { productId: 'p1', sellerId: 's1', quantity: 3, unitPriceSnapshot: 12 },
        // Brand-new product: should add a new row.
        { productId: 'p2', sellerId: 's2', quantity: 4, unitPriceSnapshot: 25 },
      ],
      strategy: 'merge',
    });

    // Two items: p1 (merged), p2 (merged again with qty 1+4=5)
    expect(result.cart.items).toHaveLength(2);
    const p1 = result.cart.items.find((i) => i.productId.value === 'p1');
    expect(p1?.quantity).toBe(5);
    const p2 = result.cart.items.find((i) => i.productId.value === 'p2');
    expect(p2?.quantity).toBe(5);
    expect(result.migratedCount).toBe(2);
  });

  it('merge strategy: same product with different resolved customization IDs stays as separate line items', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 12, sellerId: 's1' }]);
    customizationLookup.seed([
      {
        id: 'c-a',
        productId: 'p1',
        text: 'First note',
      },
      {
        id: 'c-b',
        productId: 'p1',
        text: 'Second note',
      },
    ]);

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 12,
          customizationText: 'First note',
        },
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 2,
          unitPriceSnapshot: 12,
          customizationText: 'Second note',
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(2);
    expect(result.cart.items.map((item) => item.customizationIdList)).toEqual([
      ['c-a'],
      ['c-b'],
    ]);
    expect(result.cart.items.map((item) => item.quantity)).toEqual([1, 2]);
    expect(result.migratedCount).toBe(2);
  });

  it('creates a new customization when the guest payload does not match an existing one', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 12, sellerId: 's1' }]);

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 12,
          customizationText: 'Unique note',
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].customizationIdList).toEqual([
      'created-p1-Unique note',
    ]);
  });

  it('skips customization creation when the capability does not allow photo uploads', async () => {
    capabilityPort = {
      async getConfig() {
        return ProductCustomizationConfig.fromJson({
          mode: 'description',
          previewEnabled: false,
        });
      },
    };
    useCase = new MigrateGuestCart(
      cartRepo,
      productRepo,
      outboxRepo,
      customizationLookup,
      capabilityPort,
      customizationCreator,
    );

    productRepo.seed([{ id: 'p1', basePrice: 12, sellerId: 's1' }]);

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 12,
          customizationImageUrl: 'https://cdn.example.com/photo.png',
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(0);
    expect(result.skippedCustomizationProductIds).toEqual(['p1']);
  });

  it('merge: resolves text-only and imageUrl customizations in one pass', async () => {
    capabilityPort = {
      async getConfig(productId: string) {
        return ProductCustomizationConfig.fromJson({
          mode: productId === 'p1' ? 'text' : 'photo',
          previewEnabled: true,
          previewTemplateUrl: 'https://cdn.example.com/base.png',
        });
      },
    };
    useCase = new MigrateGuestCart(
      cartRepo,
      productRepo,
      outboxRepo,
      customizationLookup,
      capabilityPort,
      customizationCreator,
    );

    productRepo.seed([
      { id: 'p1', basePrice: 10, sellerId: 's1' },
      { id: 'p2', basePrice: 20, sellerId: 's1' },
    ]);
    customizationLookup.seed([
      {
        id: 'c-text-only',
        productId: 'p1',
        text: 'Gift note',
      },
      {
        id: 'c-image-only',
        productId: 'p2',
        imageUrl: 'https://cdn.example.com/mockup.png',
      },
    ]);

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 10,
          customizationText: 'Gift note',
        },
        {
          productId: 'p2',
          sellerId: 's1',
          quantity: 2,
          unitPriceSnapshot: 20,
          customizationImageUrl: 'https://cdn.example.com/mockup.png',
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(2);
    expect(
      result.cart.items.find((i) => i.productId.value === 'p1')
        ?.customizationIdList,
    ).toEqual(['c-text-only']);
    expect(
      result.cart.items.find((i) => i.productId.value === 'p2')
        ?.customizationIdList,
    ).toEqual(['c-image-only']);
    expect(result.skippedProductIds).toEqual([]);
    expect(result.skippedCustomizationProductIds).toEqual([]);
  });

  it('keeps empty customizationIdList when guest item has no customization fields', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 10,
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].customizationIdList).toEqual([]);
    expect(result.skippedProductIds).toEqual([]);
    expect(result.skippedCustomizationProductIds).toEqual([]);
  });

  it('marks unresolved customization matches separately from unavailable products', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    customizationLookup.seed([
      {
        id: 'c-known',
        productId: 'p1',
        text: 'Known',
        color: 'red',
      },
    ]);

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 10,
          customizationText: 'Missing',
          customizationColor: 'red',
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(0);
    expect(result.migratedCount).toBe(0);
    expect(result.skippedProductIds).toEqual([]);
    expect(result.skippedCustomizationProductIds).toEqual(['p1']);
  });

  // -------------------------------------------------------------------------
  // Keep-server strategy
  // -------------------------------------------------------------------------

  it('keep-server: server cart is unchanged, guest cart items are discarded', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [makeItem({ id: 'server-i1', cartId: 'c1' })],
      }),
    );

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        { productId: 'p1', sellerId: 's1', quantity: 5, unitPriceSnapshot: 10 },
      ],
      strategy: 'keep-server',
    });

    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].id).toBe('server-i1');
    expect(result.migratedCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Keep-guest strategy
  // -------------------------------------------------------------------------

  it('keep-guest: server cart is replaced with guest items', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 12, sellerId: 's1' }]);
    await cartRepo.save(
      makeCart({
        id: 'c1',
        userId: 'u1',
        items: [
          makeItem({
            id: 'server-i1',
            cartId: 'c1',
            productId: ProductId.create('p1'),
            quantity: 1,
            unitPriceSnapshot: Money.create(10, Currency.EUR),
          }),
        ],
      }),
    );

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'p1',
          sellerId: 's1',
          quantity: 4,
          unitPriceSnapshot: 999, // discarded; current price is used
        },
      ],
      strategy: 'keep-guest',
    });

    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].quantity).toBe(4);
    expect(result.cart.items[0].unitPriceSnapshot.amount).toBe(12);
    expect(result.migratedCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Unavailable product filtering
  // -------------------------------------------------------------------------

  it('unavailable products are filtered out of the guest cart', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);
    // p2 is not seeded → unavailable

    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        { productId: 'p1', sellerId: 's1', quantity: 1, unitPriceSnapshot: 10 },
        { productId: 'p2', sellerId: 's1', quantity: 1, unitPriceSnapshot: 20 },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].productId.value).toBe('p1');
    // migratedCount counts only items that landed
    expect(result.migratedCount).toBe(1);
    expect(result.skippedProductIds).toEqual(['p2']);
    expect(result.skippedCustomizationProductIds).toEqual([]);
  });

  it('when every guest item is unavailable, no cart is created and migratedCount is 0', async () => {
    const result = await useCase.execute({
      userId: 'u1',
      guestItems: [
        {
          productId: 'missing',
          sellerId: 's1',
          quantity: 1,
          unitPriceSnapshot: 10,
        },
      ],
      strategy: 'merge',
    });

    expect(result.cart.items).toHaveLength(0);
    expect(result.migratedCount).toBe(0);
    expect(result.skippedProductIds).toEqual(['missing']);
    expect(result.skippedCustomizationProductIds).toEqual([]);
    expect(outboxRepo.events).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Event emission
  // -------------------------------------------------------------------------

  it('emits GUEST_CART_MIGRATED with the strategy, item count, and userId', async () => {
    productRepo.seed([{ id: 'p1', basePrice: 10, sellerId: 's1' }]);

    await useCase.execute({
      userId: 'u1',
      guestItems: [
        { productId: 'p1', sellerId: 's1', quantity: 1, unitPriceSnapshot: 10 },
      ],
      strategy: 'merge',
    });

    const ev = outboxRepo.events.find(
      (e) => e.eventType === GlobalEvents.GUEST_CART_MIGRATED,
    );
    expect(ev).toBeDefined();
    const payload = ev!.payload as {
      userId: string;
      strategy: string;
      itemCount: number;
    };
    expect(payload.userId).toBe('u1');
    expect(payload.strategy).toBe('merge');
    expect(payload.itemCount).toBe(1);
  });
});
