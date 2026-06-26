import type {
  CartEntity,
  CartItemEntity,
} from '@/modules/cart/domain/cart-repository';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import type { CartRepository } from '@/modules/cart/domain/cart-repository';
import type { CartId } from '@/modules/cart/domain/value-objects/cart-id';
import type { CartItemId } from '@/modules/cart/domain/value-objects/cart-item-id';
import { CartAlreadyActiveError } from '@/modules/cart/domain/errors';

/**
 * In-memory CartRepository test double.
 *
 * Mirrors the production port 1:1 so use case tests can wire it in place of
 * the Prisma adapter. Stores carts and items in plain arrays and re-hydrates
 * the `items` field on every read.
 *
 * Enforces the "one ACTIVE cart per user" invariant from spec REQ-CART-001
 * the same way the production partial unique index does, by throwing
 * CartAlreadyActiveError on save.
 */
export class MemoryCartRepository implements CartRepository {
  private carts: CartEntity[] = [];
  private items: CartItemEntity[] = [];

  async findActiveByUserId(userId: string): Promise<CartEntity | null> {
    const cart = this.carts.find(
      (c) => c.userId === userId && c.status === CartStatus.Active,
    );
    if (!cart) return null;
    return this.hydrate(cart);
  }

  async findById(cartId: CartId): Promise<CartEntity | null> {
    const cart = this.carts.find((c) => c.id === cartId.value);
    if (!cart) return null;
    return this.hydrate(cart);
  }

  async save(cart: CartEntity): Promise<CartEntity> {
    // Enforce spec REQ-CART-001: a user may have at most one ACTIVE cart.
    // The Prisma adapter enforces this via the Cart_userId_active_unique
    // partial index; the in-memory double mirrors the same invariant.
    if (cart.status === CartStatus.Active) {
      const conflicting = this.carts.find(
        (c) =>
          c.userId === cart.userId &&
          c.status === CartStatus.Active &&
          c.id !== cart.id,
      );
      if (conflicting) {
        throw new CartAlreadyActiveError(
          `User ${cart.userId} already has an active cart (${conflicting.id})`,
        );
      }
    }

    const existingIndex = this.carts.findIndex((c) => c.id === cart.id);
    if (existingIndex >= 0) {
      this.carts[existingIndex] = { ...cart };
    } else {
      this.carts.push({ ...cart });
    }

    // Replace items for this cart
    this.items = this.items.filter((i) => i.cartId !== cart.id);
    for (const item of cart.items) {
      this.items.push({ ...item, cartId: cart.id });
    }

    return this.hydrate({ ...cart });
  }

  async markCheckedOut(cartId: CartId): Promise<void> {
    const target = cartId.value;
    const index = this.carts.findIndex((c) => c.id === target);
    if (index === -1) return;
    this.carts[index] = {
      ...this.carts[index],
      status: CartStatus.CheckedOut,
    };
  }

  async deleteItem(itemId: CartItemId): Promise<void> {
    const target = itemId.value;
    this.items = this.items.filter((i) => i.id !== target);
  }

  async findItemById(itemId: CartItemId): Promise<CartItemEntity | null> {
    const target = itemId.value;
    const found = this.items.find((i) => i.id === target);
    // Return a shallow copy so callers cannot mutate the backing store
    // through the returned reference.
    return found ? { ...found } : null;
  }

  async findItemsByCartId(cartId: CartId): Promise<CartItemEntity[]> {
    const target = cartId.value;
    return this.items.filter((i) => i.cartId === target).map((i) => ({ ...i }));
  }

  private hydrate(cart: CartEntity): CartEntity {
    return {
      ...cart,
      items: this.items
        .filter((i) => i.cartId === cart.id)
        .map((i) => ({ ...i })),
    };
  }
}
