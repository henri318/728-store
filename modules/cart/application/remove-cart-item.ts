import type { CartRepository } from '../domain/cart-repository';
import { CartItemId } from '../domain/value-objects/cart-item-id';
import { CartId } from '../domain/value-objects/cart-id';
import { CartStatus } from '../domain/value-objects/cart-status';
import {
  ItemNotFoundError,
  ForbiddenError,
  CartImmutableError,
  CartNotFoundError,
} from '../domain/errors';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

// --- Data Transfer Object ---

export interface RemoveCartItemDTO {
  userId: string;
  itemId: string;
}

// --- Use Case ---

/**
 * RemoveCartItem — removes a single line item from the user's cart.
 *
 * Spec REQ-CART-013:
 *  - Loads the item, then the parent cart.
 *  - Ownership: cross-user removal → ForbiddenError.
 *  - State: removal on a CHECKED_OUT cart → CartImmutableError.
 *  - The cart stays ACTIVE — removing the last item yields an empty cart.
 *  - Emits CartItemRemoved.
 */
export class RemoveCartItem {
  constructor(
    private cartRepository: CartRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: RemoveCartItemDTO): Promise<void> {
    // 1. Load the item.
    const item = await this.cartRepository.findItemById(
      CartItemId.create(dto.itemId),
    );
    if (!item) {
      throw new ItemNotFoundError(
        `Cart item ${dto.itemId} not found`,
        `Cart item not found`,
      );
    }

    // 2. Load the parent cart.
    const cart = await this.cartRepository.findById(CartId.create(item.cartId));
    if (!cart) {
      throw new CartNotFoundError(
        `Cart ${item.cartId} not found`,
        `Cart not found`,
      );
    }

    // 3. Ownership check.
    if (cart.userId !== dto.userId) {
      throw new ForbiddenError(
        `User ${dto.userId} cannot modify item in cart owned by ${cart.userId}`,
      );
    }

    // 4. Cart state check.
    if (cart.status !== CartStatus.Active) {
      throw new CartImmutableError(
        `Cart ${cart.id} is not editable (status=${cart.status})`,
      );
    }

    // 5. Remove the item from the cart and save.
    const updatedItems = cart.items.filter((i) => i.id !== item.id);
    await this.cartRepository.save({
      ...cart,
      items: updatedItems,
      updatedAt: new Date(),
    });

    // 6. Emit event.
    await this.outboxRepository.saveEvent(GlobalEvents.CART_ITEM_REMOVED, {
      cartId: cart.id,
      itemId: item.id,
      occurredAt: new Date().toISOString(),
    });
  }
}
