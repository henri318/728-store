import type {
  CartEntity,
  CartItemEntity,
} from '@/modules/cart/domain/cart-repository';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import type { CartRepository } from '@/modules/cart/domain/cart-repository';

/**
 * In-memory CartRepository test double.
 *
 * Mirrors the production port 1:1 so use case tests can wire it in place of
 * the Prisma adapter. Stores carts and items in plain arrays and re-hydrates
 * the `items` field on every read.
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

  async findById(cartId: string): Promise<CartEntity | null> {
    const cart = this.carts.find((c) => c.id === cartId);
    if (!cart) return null;
    return this.hydrate(cart);
  }

  async save(cart: CartEntity): Promise<CartEntity> {
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

  async markCheckedOut(cartId: string): Promise<void> {
    const index = this.carts.findIndex((c) => c.id === cartId);
    if (index === -1) return;
    this.carts[index] = {
      ...this.carts[index],
      status: CartStatus.CheckedOut,
    };
  }

  async deleteItem(itemId: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== itemId);
  }

  async findItemById(itemId: string): Promise<CartItemEntity | null> {
    return this.items.find((i) => i.id === itemId) ?? null;
  }

  async findItemsByCartId(cartId: string): Promise<CartItemEntity[]> {
    return this.items.filter((i) => i.cartId === cartId).map((i) => ({ ...i }));
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
