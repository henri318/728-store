import type { CartRepository } from '../domain/cart-repository';
import type { CartItemEntity } from '../domain/entities/cart-item';
import type { ProductRepository } from '../domain/product-repository';
import type { CustomizationLookupPort } from '../domain/customization-lookup-port';
import { CartStatus } from '../domain/value-objects/cart-status';
import { Quantity } from '../domain/value-objects/quantity';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import {
  ProductNotFoundError,
  InvalidCustomizationError,
} from '../domain/errors';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

// --- Data Transfer Objects ---

export interface AddItemToCartDTO {
  userId: string;
  productId: string;
  quantity: number;
  customizationIdList?: string[];
}

// --- Use Case ---

/**
 * AddItemToCart — adds a product to the user's ACTIVE cart.
 *
 * Behavior (spec REQ-CART-011 / REQ-CART-001 / REQ-CART-002):
 *  - Auto-creates the cart on first add (REQ-CART-001).
 *  - Captures the current product basePrice + sellerId as the snapshot
 *    (REQ-CART-002).
 *  - If an item with the same productId + sorted customizationIdList
 *    already exists, increments its quantity (merge). Otherwise creates
 *    a new row (separate row per customization variant).
 *  - Validates all customizationIdList entries exist and belong to the
 *    product (and therefore to the same seller). Throws
 *    InvalidCustomizationError on mismatch.
 *  - Rejects invalid quantity (1..99 via the Quantity VO) and unknown
 *    products.
 *  - Rejects mutations on a CHECKED_OUT cart.
 *  - Emits CartCreated on first add, then CartItemAdded for every add.
 *
 * The use case depends only on the CartRepository, ProductRepository,
 * CustomizationLookupPort and OutboxRepository ports. Persistence is
 * the adapter's job.
 */
export class AddItemToCart {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
    private customizationLookup: CustomizationLookupPort,
  ) {}

  async execute(dto: AddItemToCartDTO): Promise<CartItemEntity> {
    // 1. Validate quantity (throws InvalidQuantityError on out-of-range)
    const quantity = Quantity.create(dto.quantity);

    // 2. Load product snapshot (throws ProductNotFoundError if missing)
    const productId = ProductId.create(dto.productId);
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(
        `Product ${dto.productId} not found`,
        `Product not found`,
      );
    }

    // 3. Validate customizations (if any). Deduplicate first — duplicate
    //    IDs would cause the length check in validateCustomizations to
    //    falsely reject a valid list.
    const customizationIdList = [...new Set(dto.customizationIdList ?? [])];
    if (customizationIdList.length > 0) {
      await this.validateCustomizations(
        customizationIdList,
        dto.productId,
        product.sellerId.value,
      );
    }

    // 4. Find or create the ACTIVE cart for the user. Spec REQ-CART-001
    //    states a user has at most one ACTIVE cart. A user with only a
    //    CHECKED_OUT cart (history) still gets a fresh ACTIVE cart.
    let cart = await this.cartRepository.findActiveByUserId(dto.userId);
    const isNewCart = cart === null;
    if (isNewCart) {
      const now = new Date();
      cart = {
        id: crypto.randomUUID(),
        userId: dto.userId,
        status: CartStatus.Active,
        items: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // 5. Find an existing item with the same product + customization
    const existing = cart!.items.find((item) =>
      isSameVariant(item, productId, customizationIdList),
    );

    let updatedItem: CartItemEntity;
    let updatedItems: CartItemEntity[];

    if (existing) {
      // Merge: increment quantity. Quantity.create enforces the 99 ceiling.
      const newQuantity = Quantity.create(existing.quantity + dto.quantity);
      updatedItem = {
        ...existing,
        quantity: newQuantity.value,
        // Re-validate the snapshot in case the product's price changed
        // while the item was in the cart. The checkout path will detect
        // mismatches and ask the user to confirm; here we keep the
        // original snapshot per spec (snapshot is captured at add time).
      };
      updatedItems = cart!.items.map((i) =>
        i.id === existing.id ? updatedItem : i,
      );
    } else {
      // Create a new item with a fresh snapshot.
      updatedItem = {
        id: crypto.randomUUID(),
        cartId: cart!.id,
        productId,
        sellerId: product.sellerId,
        quantity: quantity.value,
        unitPriceSnapshot: Money.create(product.basePrice, product.currency),
        customizationIdList: [...customizationIdList].sort(),
      };
      updatedItems = [...cart!.items, updatedItem];
    }

    // 6. Persist the cart with the updated items + bumped updatedAt
    const savedCart = await this.cartRepository.save({
      ...cart!,
      items: updatedItems,
      updatedAt: new Date(),
    });

    // 7. Emit events
    if (isNewCart) {
      await this.outboxRepository.saveEvent(GlobalEvents.CART_CREATED, {
        cartId: savedCart.id,
        userId: savedCart.userId,
        occurredAt: new Date().toISOString(),
      });
    }
    await this.outboxRepository.saveEvent(GlobalEvents.CART_ITEM_ADDED, {
      cartId: savedCart.id,
      itemId: updatedItem.id,
      productId: updatedItem.productId.value,
      sellerId: updatedItem.sellerId.value,
      quantity: updatedItem.quantity,
      customizationIdList: updatedItem.customizationIdList,
      occurredAt: new Date().toISOString(),
    });

    return updatedItem;
  }

  /**
   * Validates that all customization IDs exist and belong to the
   * target product (and therefore the same seller). Throws
   * InvalidCustomizationError if any ID is missing or belongs to
   * a different product.
   */
  private async validateCustomizations(
    customizationIdList: string[],
    productId: string,
    sellerId: string,
  ): Promise<void> {
    const snapshots =
      await this.customizationLookup.findByIds(customizationIdList);

    // Check all IDs were found
    if (snapshots.length !== customizationIdList.length) {
      throw new InvalidCustomizationError(
        `Some customization IDs do not exist`,
        `One or more selected customizations are not available`,
      );
    }

    // Check all customizations belong to the product
    for (const snapshot of snapshots) {
      if (snapshot.productId !== productId) {
        throw new InvalidCustomizationError(
          `Customization ${snapshot.id} does not belong to product ${productId}`,
          `One or more selected customizations are not available for this product`,
        );
      }
    }

    // Note: sellerId validation is implicit — customizations derive
    // their sellerId from the Product. If productId matches, the
    // sellerId is guaranteed to match (enforced at customization
    // creation time by the customizations module).
    void sellerId;
  }
}

// --- helpers ---

function isSameVariant(
  item: CartItemEntity,
  productId: ProductId,
  customizationIdList: string[],
): boolean {
  if (!item.productId.equals(productId)) return false;
  // Compare sorted customization ID lists — same IDs in any order
  // means the same variant.
  const a = [...item.customizationIdList].sort();
  const b = [...customizationIdList].sort();
  return JSON.stringify(a) === JSON.stringify(b);
}
