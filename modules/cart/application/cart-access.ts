import type { CartRepository } from '../domain/cart-repository';
import type { CartItemEntity } from '../domain/entities/cart-item';
import type { CartEntity } from '../domain/entities/cart';
import { CartItemId } from '../domain/value-objects/cart-item-id';
import { CartId } from '../domain/value-objects/cart-id';
import { CartStatus } from '../domain/value-objects/cart-status';
import {
  ItemNotFoundError,
  ForbiddenError,
  CartImmutableError,
  CartNotFoundError,
} from '../domain/errors';

export async function loadAndVerifyCart(
  cartRepository: CartRepository,
  userId: string,
  itemId: string,
): Promise<{ item: CartItemEntity; cart: CartEntity }> {
  const item = await cartRepository.findItemById(CartItemId.create(itemId));
  if (!item) {
    throw new ItemNotFoundError(
      `Cart item ${itemId} not found`,
      `Cart item not found`,
    );
  }

  const cart = await cartRepository.findById(CartId.create(item.cartId));
  if (!cart) {
    throw new CartNotFoundError(
      `Cart ${item.cartId} not found`,
      `Cart not found`,
    );
  }

  if (cart.userId !== userId) {
    throw new ForbiddenError(
      `User ${userId} cannot modify item in cart owned by ${cart.userId}`,
    );
  }

  if (cart.status !== CartStatus.Active) {
    throw new CartImmutableError(
      `Cart ${cart.id} is not editable (status=${cart.status})`,
    );
  }

  return { item, cart };
}
