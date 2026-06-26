import type { CartEntity } from './entities/cart';
import type { CartItemEntity } from './entities/cart-item';
import type { CartId } from './value-objects/cart-id';
import type { CartItemId } from './value-objects/cart-item-id';

export type { CartEntity, CartItemEntity };

/**
 * CartRepository — persistence port for the Cart aggregate.
 *
 * Implementations are responsible for hydrating `items` when returning a
 * cart so the application layer never has to do an extra round-trip.
 *
 * The port boundary uses value objects (CartId, CartItemId) for identifiers
 * so the application layer can never accidentally pass a raw string where a
 * typed id is expected. Persistence DTOs (Prisma rows) keep their primitives;
 * the adapter translates at the seam.
 */
export interface CartRepository {
  /**
   * Returns the ACTIVE cart for the user with items hydrated, or null
   * when the user has no active cart.
   */
  findActiveByUserId(userId: string): Promise<CartEntity | null>;

  /** Returns a cart by id (any status) with items hydrated, or null. */
  findById(cartId: CartId): Promise<CartEntity | null>;

  /**
   * Persists a cart and its items. When a cart with the same id already
   * exists it is replaced. Returns the stored entity.
   */
  save(cart: CartEntity): Promise<CartEntity>;

  /**
   * Transitions the cart to CHECKED_OUT. No-op if the cart does not exist.
   * The optional `tx` argument is the Prisma transaction client — only the
   * Prisma adapter uses it; in-memory implementations ignore it. This lets
   * `CheckoutCart` wrap the status update + outbox write in a single
   * atomic unit of work (spec REQ-CART-022).
   */
  markCheckedOut(cartId: CartId, tx?: unknown): Promise<void>;

  /**
   * Removes a single item by id. No-op if the item does not exist.
   */
  deleteItem(itemId: CartItemId): Promise<void>;

  /** Returns the item with the given id, or null. */
  findItemById(itemId: CartItemId): Promise<CartItemEntity | null>;

  /** Returns all items for a cart. Empty array when the cart has none. */
  findItemsByCartId(cartId: CartId): Promise<CartItemEntity[]>;
}
