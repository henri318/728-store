import type { CartRepository } from '../domain/cart-repository';
import { CartItemId } from '../domain/value-objects/cart-item-id';
import { CartId } from '../domain/value-objects/cart-id';
import { Quantity } from '../domain/value-objects/quantity';
import { CartStatus } from '../domain/value-objects/cart-status';
import {
  ItemNotFoundError,
  ForbiddenError,
  CartImmutableError,
  CartNotFoundError,
} from '../domain/errors';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { CartItemEntity } from '../domain/entities/cart-item';

// --- Data Transfer Object ---

export interface UpdateCartItemQuantityDTO {
  userId: string;
  itemId: string;
  quantity: number;
}

// --- Use Case ---

/**
 * UpdateCartItemQuantity — sets an item's quantity on the user's ACTIVE cart.
 *
 * Spec REQ-CART-012:
 *  - Validates quantity (1..99) — throws InvalidQuantityError on out-of-range.
 *  - Loads the item, then the parent cart via its cartId.
 *  - Rejects cross-user updates with ForbiddenError.
 *  - Rejects updates on a CHECKED_OUT cart with CartImmutableError.
 *  - Persists the updated item and emits CartItemUpdated.
 */
export class UpdateCartItemQuantity {
  constructor(
    private cartRepository: CartRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: UpdateCartItemQuantityDTO): Promise<CartItemEntity> {
    // 1. Validate quantity.
    const quantity = Quantity.create(dto.quantity);

    // 2. Load the item.
    const item = await this.cartRepository.findItemById(
      CartItemId.create(dto.itemId),
    );
    if (!item) {
      throw new ItemNotFoundError(
        `Cart item ${dto.itemId} not found`,
        `Cart item not found`,
      );
    }

    // 3. Load the parent cart.
    const cart = await this.cartRepository.findById(CartId.create(item.cartId));
    if (!cart) {
      throw new CartNotFoundError(
        `Cart ${item.cartId} not found`,
        `Cart not found`,
      );
    }

    // 4. Ownership check.
    if (cart.userId !== dto.userId) {
      throw new ForbiddenError(
        `User ${dto.userId} cannot modify item in cart owned by ${cart.userId}`,
      );
    }

    // 5. Cart state check.
    if (cart.status !== CartStatus.Active) {
      throw new CartImmutableError(
        `Cart ${cart.id} is not editable (status=${cart.status})`,
      );
    }

    // 6. Update the item, preserving the snapshot.
    const updatedItem: CartItemEntity = {
      ...item,
      quantity: quantity.value,
    };
    const updatedItems = cart.items.map((i) =>
      i.id === item.id ? updatedItem : i,
    );

    await this.cartRepository.save({
      ...cart,
      items: updatedItems,
      updatedAt: new Date(),
    });

    // 7. Emit event.
    await this.outboxRepository.saveEvent(GlobalEvents.CART_ITEM_UPDATED, {
      cartId: cart.id,
      itemId: updatedItem.id,
      quantity: updatedItem.quantity,
      occurredAt: new Date().toISOString(),
    });

    return updatedItem;
  }
}
