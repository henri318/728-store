import type { CartEntity } from './entities/cart';
import type { CartItemEntity } from './entities/cart-item';

export type { CartEntity, CartItemEntity };

/**
 * CartRepository — persistence port for the Cart aggregate.
 *
 * Implementations are responsible for hydrating `items` when returning a
 * cart so the application layer never has to do an extra round-trip.
 */
export interface CartRepository {
  /**
   * Returns the ACTIVE cart for the user with items hydrated, or null
   * when the user has no active cart.
   */
  findActiveByUserId(userId: string): Promise<CartEntity | null>;

  /** Returns a cart by id (any status) with items hydrated, or null. */
  findById(cartId: string): Promise<CartEntity | null>;

  /**
   * Persists a cart and its items. When a cart with the same id already
   * exists it is replaced. Returns the stored entity.
   */
  save(cart: CartEntity): Promise<CartEntity>;

  /**
   * Transitions the cart to CHECKED_OUT. No-op if the cart does not exist.
   */
  markCheckedOut(cartId: string): Promise<void>;

  /**
   * Removes a single item by id. No-op if the item does not exist.
   */
  deleteItem(itemId: string): Promise<void>;

  /** Returns the item with the given id, or null. */
  findItemById(itemId: string): Promise<CartItemEntity | null>;

  /** Returns all items for a cart. Empty array when the cart has none. */
  findItemsByCartId(cartId: string): Promise<CartItemEntity[]>;
}
