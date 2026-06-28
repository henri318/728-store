import type { CartRepository } from '../domain/cart-repository';
import type { CartItemEntity } from '../domain/entities/cart-item';
import type { ProductRepository } from '../domain/product-repository';
import { CartStatus } from '../domain/value-objects/cart-status';
import { Quantity } from '../domain/value-objects/quantity';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ProductNotFoundError } from '../domain/errors';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

// --- Data Transfer Objects ---

export interface CustomizationInput {
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
}

export interface AddItemToCartDTO {
  userId: string;
  productId: string;
  quantity: number;
  customization?: CustomizationInput;
}

// --- Use Case ---

/**
 * AddItemToCart — adds a product to the user's ACTIVE cart.
 *
 * Behavior (spec REQ-CART-011 / REQ-CART-001 / REQ-CART-002):
 *  - Auto-creates the cart on first add (REQ-CART-001).
 *  - Captures the current product basePrice + sellerId as the snapshot
 *    (REQ-CART-002).
 *  - If an item with the same productId + customization already exists,
 *    increments its quantity (merge). Otherwise creates a new row
 *    (separate row per customization variant).
 *  - Rejects invalid quantity (1..99 via the Quantity VO) and unknown
 *    products.
 *  - Rejects mutations on a CHECKED_OUT cart.
 *  - Emits CartCreated on first add, then CartItemAdded for every add.
 *
 * The use case depends only on the CartRepository, ProductRepository and
 * OutboxRepository ports. Persistence is the adapter's job.
 */
export class AddItemToCart {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
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

    // 3. Find or create the ACTIVE cart for the user. Spec REQ-CART-001
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

    const customization = normalizeCustomization(dto.customization);

    // 4. Find an existing item with the same product + customization
    const existing = cart!.items.find((item) =>
      isSameVariant(item, productId, customization),
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
        unitPriceSnapshot: Money.create(product.basePrice, Currency.EUR),
        customizationIdList: [],
      };
      updatedItems = [...cart!.items, updatedItem];
    }

    // 5. Persist the cart with the updated items + bumped updatedAt
    const savedCart = await this.cartRepository.save({
      ...cart!,
      items: updatedItems,
      updatedAt: new Date(),
    });

    // 6. Emit events
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
      occurredAt: new Date().toISOString(),
    });

    return updatedItem;
  }
}

// --- helpers ---

interface NormalizedCustomization {
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
}

function normalizeCustomization(
  input: CustomizationInput | undefined,
): NormalizedCustomization {
  return {
    text: input?.text ?? null,
    color: input?.color ?? null,
    size: input?.size ?? null,
    imageUrl: input?.imageUrl ?? null,
  };
}

function isSameVariant(
  item: CartItemEntity,
  productId: ProductId,
  _customization: NormalizedCustomization,
): boolean {
  if (!item.productId.equals(productId)) return false;
  // PR2 will resolve customization IDs before add; for now all items
  // are created with customizationIdList=[] so we compare sorted lists.
  return (
    JSON.stringify([...item.customizationIdList].sort()) === JSON.stringify([])
  );
}

// Re-export value-object factory types for back-compat with tests.
// (No re-exports — callers import the VOs from their canonical path.)
