import type { CartRepository } from '../domain/cart-repository';
import { loadAndVerifyCart } from './cart-access';
import type { CartItemEntity } from '../domain/entities/cart-item';
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
    const { item, cart } = await loadAndVerifyCart(
      this.cartRepository,
      dto.userId,
      dto.itemId,
    );

    // 5. Remove the item from the cart and save.
    const updatedItems = cart.items.filter(
      (i: CartItemEntity) => i.id !== item.id,
    );
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
