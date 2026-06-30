import type { CartRepository } from '../domain/cart-repository';
import type { ProductRepository } from '../domain/product-repository';
import type { CustomizationLookupPort } from '../domain/customization-lookup-port';
import type { CustomizationCreatePort } from '../domain/customization-create-port';
import { CartStatus } from '../domain/value-objects/cart-status';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { CartEntity } from '../domain/entities/cart';
import type { CartItemEntity } from '../domain/entities/cart-item';
import type { ProductCapabilityPort } from '@/modules/products/domain/product-capability-port';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';

// --- Types ---

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
  skippedCustomizationProductIds: string[];
}

// --- Use Case ---

export class MigrateGuestCart {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
    private customizationLookup: CustomizationLookupPort,
    private productCapability?: ProductCapabilityPort,
    private customizationCreator?: CustomizationCreatePort,
  ) {}

  async execute(dto: MigrateGuestCartDTO): Promise<MigrateGuestCartResult> {
    const serverCart = await this.cartRepository.findActiveByUserId(dto.userId);

    if (dto.guestItems.length === 0) {
      return {
        cart: serverCart ?? this.emptyCart(dto.userId),
        migratedCount: 0,
        skippedProductIds: [],
        skippedCustomizationProductIds: [],
      };
    }

    const productIds = dto.guestItems.map((g) => ProductId.create(g.productId));
    const uniqueIds = uniqueBy(productIds, (p) => p.value);
    const productMap = await this.productRepository.findByIds(uniqueIds);

    const customizationByProductId = new Map<string, CustomizationRecord[]>();
    const capabilityByProductId = new Map<string, ProductCustomizationConfig>();
    const createdCustomizationCache = new Map<string, string>();
    const availableProductIds = [
      ...new Set(dto.guestItems.map((g) => g.productId)),
    ].filter((productId) => productMap.has(productId));
    for (const productId of availableProductIds) {
      customizationByProductId.set(
        productId,
        await this.customizationLookup.findByProductId(productId),
      );
    }

    if (this.productCapability) {
      for (const productId of availableProductIds) {
        capabilityByProductId.set(
          productId,
          (await this.productCapability?.getConfig(productId)) ??
            ProductCustomizationConfig.default(),
        );
      }
    }

    const availableGuest: Array<{
      item: GuestCartItem;
      customizationIdList: string[];
    }> = [];
    const skippedProductIds: string[] = [];
    const skippedCustomizationProductIds: string[] = [];

    for (const g of dto.guestItems) {
      if (!productMap.has(g.productId)) {
        if (!skippedProductIds.includes(g.productId)) {
          skippedProductIds.push(g.productId);
        }
        continue;
      }

      const capability = capabilityByProductId.get(g.productId);
      if (capability && !isCustomizationAllowed(g, capability)) {
        if (!skippedCustomizationProductIds.includes(g.productId)) {
          skippedCustomizationProductIds.push(g.productId);
        }
        continue;
      }

      const customizationIdList = await resolveGuestCustomizationIds(
        g,
        customizationByProductId.get(g.productId) ?? [],
        this.customizationCreator,
        createdCustomizationCache,
      );
      if (customizationIdList === null) {
        if (!skippedCustomizationProductIds.includes(g.productId)) {
          skippedCustomizationProductIds.push(g.productId);
        }
        continue;
      }

      availableGuest.push({ item: g, customizationIdList });
    }

    if (availableGuest.length === 0) {
      return {
        cart: serverCart ?? this.emptyCart(dto.userId),
        migratedCount: 0,
        skippedProductIds,
        skippedCustomizationProductIds,
      };
    }

    let resultCart: CartEntity;
    let isNewCart = false;

    if (!serverCart) {
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
    const touchedIds = new Set<string>();

    if (dto.strategy === 'keep-server' && !isNewCart) {
      // no-op
    } else if (dto.strategy === 'keep-guest' && !isNewCart) {
      items = availableGuest.map(({ item: g, customizationIdList }) => {
        const built = this.buildItem(
          g,
          resultCart.id,
          productMap,
          customizationIdList,
        );
        touchedIds.add(built.id);
        return built;
      });
    } else {
      for (const { item: g, customizationIdList } of availableGuest) {
        const productSnap = productMap.get(g.productId)!;
        const existing = items.find((i) =>
          isSameVariant(i, g, productSnap, customizationIdList),
        );
        if (existing) {
          items = items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + g.quantity }
              : i,
          );
          touchedIds.add(existing.id);
        } else {
          const built = this.buildItem(
            g,
            resultCart.id,
            productMap,
            customizationIdList,
          );
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
      skippedCustomizationProductIds,
    };
  }

  private buildItem(
    g: GuestCartItem,
    cartId: string,
    productMap: Map<
      string,
      { basePrice: number; currency: Currency; sellerId: SellerId }
    >,
    customizationIdList: string[],
  ): CartItemEntity {
    const product = productMap.get(g.productId)!;
    return {
      id: crypto.randomUUID(),
      cartId,
      productId: ProductId.create(g.productId),
      sellerId: product.sellerId,
      quantity: g.quantity,
      unitPriceSnapshot: Money.create(product.basePrice, product.currency),
      customizationIdList: [...customizationIdList].sort(),
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

type CustomizationRecord = {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
};

function resolveGuestCustomizationIds(
  g: GuestCartItem,
  customizations: CustomizationRecord[],
  customizationCreator: CustomizationCreatePort | undefined,
  createdCustomizationCache: Map<string, string>,
): Promise<string[] | null> {
  const hasCustomization =
    (g.customizationText !== undefined && g.customizationText !== null) ||
    (g.customizationColor !== undefined && g.customizationColor !== null) ||
    (g.customizationSize !== undefined && g.customizationSize !== null) ||
    (g.customizationImageUrl !== undefined && g.customizationImageUrl !== null);

  if (!hasCustomization) return Promise.resolve([]);

  const matches = customizations.filter(
    (customization) =>
      customization.text === (g.customizationText ?? null) &&
      customization.color === (g.customizationColor ?? null) &&
      customization.size === (g.customizationSize ?? null) &&
      customization.imageUrl === (g.customizationImageUrl ?? null),
  );

  if (matches.length === 1) return Promise.resolve([matches[0].id]);
  if (matches.length > 1 || !customizationCreator) return Promise.resolve(null);

  const cacheKey = guestCustomizationKey(g);
  const cached = createdCustomizationCache.get(cacheKey);
  if (cached) return Promise.resolve([cached]);

  return customizationCreator
    .create({
      productId: g.productId,
      text: g.customizationText ?? null,
      color: g.customizationColor ?? null,
      size: g.customizationSize ?? null,
      imageUrl: g.customizationImageUrl ?? null,
    })
    .then((created) => {
      createdCustomizationCache.set(cacheKey, created.id);
      return [created.id];
    });
}

function guestCustomizationKey(g: GuestCartItem): string {
  return [
    g.productId,
    g.customizationText ?? '',
    g.customizationColor ?? '',
    g.customizationSize ?? '',
    g.customizationImageUrl ?? '',
  ].join('|');
}

function isCustomizationAllowed(
  g: GuestCartItem,
  capability: ProductCustomizationConfig,
): boolean {
  const hasText =
    g.customizationText !== undefined && g.customizationText !== null;
  const hasStyle =
    (g.customizationColor !== undefined && g.customizationColor !== null) ||
    (g.customizationSize !== undefined && g.customizationSize !== null);
  const hasPhoto =
    g.customizationImageUrl !== undefined && g.customizationImageUrl !== null;

  if (hasPhoto && !capability.allowsPhoto()) return false;
  if (hasStyle && !capability.allowsStyleOptions()) return false;
  if (hasText && !capability.allowsText()) return false;
  return true;
}

function isSameVariant(
  item: CartItemEntity,
  g: GuestCartItem,
  productSnap: { basePrice: number; currency: Currency; sellerId: SellerId },
  customizationIdList: string[],
): boolean {
  if (item.productId.value !== g.productId) return false;
  if (!item.sellerId.equals(productSnap.sellerId)) return false;
  if (item.unitPriceSnapshot.amount !== g.unitPriceSnapshot) return false;
  if (item.unitPriceSnapshot.currency !== productSnap.currency) return false;
  return (
    JSON.stringify([...item.customizationIdList].sort()) ===
    JSON.stringify([...customizationIdList].sort())
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
