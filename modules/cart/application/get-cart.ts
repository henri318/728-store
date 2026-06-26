import type { CartRepository } from '../domain/cart-repository';
import type { CartEntity } from '../domain/entities/cart';
import { CartStatus } from '../domain/value-objects/cart-status';

/**
 * GetCart — read-only query use case.
 *
 * Returns the user's ACTIVE cart (with items hydrated) or a synthetic
 * empty ACTIVE shape when the user has no cart yet. The empty shape lets
 * the API return 200 with `{ status: "ACTIVE", items: [] }` instead of
 * 404 (per spec REQ-CART-031 / Scenario "GET returns empty cart").
 */
export class GetCart {
  constructor(private cartRepository: CartRepository) {}

  async execute(userId: string): Promise<CartEntity> {
    const cart = await this.cartRepository.findActiveByUserId(userId);
    if (cart) return cart;
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
