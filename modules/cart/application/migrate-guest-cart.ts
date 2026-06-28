import type { CartRepository } from '../domain/cart-repository';
import type { ProductRepository } from '../domain/product-repository';
import { CartStatus } from '../domain/value-objects/cart-status';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { CartEntity } from '../domain/entities/cart';
import type { CartItemEntity } from '../domain/entities/cart-item';

// --- Types ---

/**
 * GuestCartItem — the wire shape the client sends from localStorage.
 *
 * `unitPriceSnapshot` is a plain number here because the guest cart lives
 * in localStorage and cannot carry the `Money` class instance. The server
 * discards it on migration and uses the current product price instead
 * (spec REQ-CART-020 / scenario "Price changes in guest cart").
 */
export interface GuestCartItem {
  productId: string;
  sellerId: string;
  quantity: number;
  unitPriceSnapshot: number;
  customizationText?: string | null;
  customizationColor?: string | null;
  customizationSize?: string | null;
  customizationImageUrl?: string | null;
}

export type MergeStrategy = 'merge' | 'keep-server' | 'keep-guest';

export interface MigrateGuestCartDTO {
  userId: string;
  guestItems: GuestCartItem[];
  strategy: MergeStrategy;
}

export interface MigrateGuestCartResult {
  cart: CartEntity;
  migratedCount: number;
  skippedProductIds: string[];
}

// --- Use Case ---

/**
 * MigrateGuestCart — merges a guest cart (from localStorage) into the
 * user's server cart on login (spec REQ-CART-020).
 *
 * Strategy matrix:
 *  - merge       : combine server + guest items, merging duplicates by
 *                  (productId + customization). Server stays ACTIVE.
 *  - keep-server : discard guest items, server cart stays as-is.
 *  - keep-guest  : replace server items with guest items (deduped).
 *
 * Behavior:
 *  - Filters out guest items whose product is no longer in the catalog.
 *  - Uses the CURRENT product price for every item (guest snapshot is
 *    discarded — see spec scenario "Price changes in guest cart").
 *  - Emits GUEST_CART_MIGRATED exactly once per non-trivial migration.
 *  - Returns the resulting cart, the count of items that actually
 *    landed, and the list of skipped product ids.
 */
export class MigrateGuestCart {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: MigrateGuestCartDTO): Promise<MigrateGuestCartResult> {
    const serverCart = await this.cartRepository.findActiveByUserId(dto.userId);

    // Empty guest cart on login → no migration. Return whatever the
    // server has (or a synthetic empty shape).
    if (dto.guestItems.length === 0) {
      return {
        cart: serverCart ?? this.emptyCart(dto.userId),
        migratedCount: 0,
        skippedProductIds: [],
      };
    }

    // Filter guest items for product availability.
    const productIds = dto.guestItems.map((g) => ProductId.create(g.productId));
    const uniqueIds = uniqueBy(productIds, (p) => p.value);
    const productMap = await this.productRepository.findByIds(uniqueIds);

    const availableGuest: GuestCartItem[] = [];
    const skippedProductIds: string[] = [];
    for (const g of dto.guestItems) {
      if (productMap.has(g.productId)) {
        availableGuest.push(g);
      } else if (!skippedProductIds.includes(g.productId)) {
        skippedProductIds.push(g.productId);
      }
    }

    // If nothing landed after filtering, return the existing server cart
    // (or empty) and skip the migration event.
    if (availableGuest.length === 0) {
      return {
        cart: serverCart ?? this.emptyCart(dto.userId),
        migratedCount: 0,
        skippedProductIds,
      };
    }

    let resultCart: CartEntity;
    let isNewCart = false;

    if (!serverCart) {
      // No server cart → create one with the (filtered) guest items.
      const now = new Date();
      resultCart = {
        id: crypto.randomUUID(),
        userId: dto.userId,
        status: CartStatus.Active,
        items: [],
        createdAt: now,
        updatedAt: now,
      };
      isNewCart = true;
    } else {
      resultCart = serverCart;
    }

    let items: CartItemEntity[] = isNewCart ? [] : [...resultCart.items];
    // Track which item ids were touched/created by this migration so we
    // only emit CartItemAdded for the guest-side changes.
    const touchedIds = new Set<string>();

    if (dto.strategy === 'keep-server' && !isNewCart) {
      // Server stays as-is. Guest items are discarded. No new row, no
      // update to existing rows. migratedCount stays 0.
    } else if (dto.strategy === 'keep-guest' && !isNewCart) {
      // Replace server items with the guest items (fresh row each).
      items = availableGuest.map((g) => {
        const built = this.buildItem(g, resultCart.id, productMap);
        touchedIds.add(built.id);
        return built;
      });
    } else {
      // merge (default) or keep-guest with a new cart.
      for (const g of availableGuest) {
        const productSnap = productMap.get(g.productId)!;
        const existing = items.find((i) => isSameVariant(i, g, productSnap));
        if (existing) {
          items = items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + g.quantity }
              : i,
          );
          touchedIds.add(existing.id);
        } else {
          const built = this.buildItem(g, resultCart.id, productMap);
          items.push(built);
          touchedIds.add(built.id);
        }
      }
    }

    resultCart = {
      ...resultCart,
      items,
      updatedAt: new Date(),
    };
    const saved = await this.cartRepository.save(resultCart);

    // Emit CartCreated when we built a new cart, plus CartItemAdded for
    // each item that landed or changed in this migration.
    if (isNewCart) {
      await this.outboxRepository.saveEvent(GlobalEvents.CART_CREATED, {
        cartId: saved.id,
        userId: saved.userId,
        occurredAt: new Date().toISOString(),
      });
    }
    for (const item of saved.items) {
      if (!touchedIds.has(item.id)) continue;
      await this.outboxRepository.saveEvent(GlobalEvents.CART_ITEM_ADDED, {
        cartId: saved.id,
        itemId: item.id,
        productId: item.productId.value,
        sellerId: item.sellerId.value,
        quantity: item.quantity,
        occurredAt: new Date().toISOString(),
      });
    }

    const migratedCount = touchedIds.size;
    await this.outboxRepository.saveEvent(GlobalEvents.GUEST_CART_MIGRATED, {
      userId: dto.userId,
      strategy: dto.strategy,
      itemCount: migratedCount,
      occurredAt: new Date().toISOString(),
    });

    return {
      cart: saved,
      migratedCount,
      skippedProductIds,
    };
  }

  // --- internals ---

  private buildItem(
    g: GuestCartItem,
    cartId: string,
    productMap: Map<
      string,
      { basePrice: number; currency: string; sellerId: SellerId }
    >,
  ): CartItemEntity {
    const product = productMap.get(g.productId)!;
    return {
      id: crypto.randomUUID(),
      cartId,
      productId: ProductId.create(g.productId),
      sellerId: product.sellerId,
      quantity: g.quantity,
      unitPriceSnapshot: Money.create(product.basePrice, Currency.EUR),
      customizationIdList: [],
    };
  }

  private emptyCart(userId: string): CartEntity {
    const now = new Date();
    return {
      id: '',
      userId,
      status: CartStatus.Active,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
  }
}

// --- helpers ---

function isSameVariant(
  item: CartItemEntity,
  g: GuestCartItem,
  productSnap: { basePrice: number; currency: string; sellerId: SellerId },
): boolean {
  if (item.productId.value !== g.productId) return false;
  if (!item.sellerId.equals(productSnap.sellerId)) return false;
  // PR2 will resolve customization IDs; for now compare sorted lists.
  return (
    JSON.stringify([...item.customizationIdList].sort()) === JSON.stringify([])
  );
}

function uniqueBy<T>(items: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}
