import type { CartRepository } from '../domain/cart-repository';
import { loadAndVerifyCart } from './cart-access';
import { Quantity } from '../domain/value-objects/quantity';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { CartItemEntity } from '../domain/entities/cart-item';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import type {
  CustomerCustomizationCreatePort,
  CustomerCustomizationInput,
} from '../domain/customer-customization-create-port';

// --- Data Transfer Object ---

export interface UpdateCartItemQuantityDTO {
  userId: string;
  itemId: string;
  quantity: number;
  customizationIdList?: string[];
  customization?: CustomerCustomizationInput;
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
    private txRunner?: TransactionRunner,
    private customizationCreator?: CustomerCustomizationCreatePort,
  ) {}

  async execute(dto: UpdateCartItemQuantityDTO): Promise<CartItemEntity> {
    const run = <T>(fn: (tx: unknown) => Promise<T>) =>
      this.txRunner ? this.txRunner.run(fn) : fn(undefined);

    return run(async (tx) => {
      // 1. Validate quantity.
      const quantity = Quantity.create(dto.quantity);

      const { item, cart } = await loadAndVerifyCart(
        this.cartRepository,
        dto.userId,
        dto.itemId,
      );

      let customizationIdList = dto.customizationIdList;
      if (dto.customization) {
        if (!this.customizationCreator) {
          throw new Error('Customer customization creator is not configured');
        }
        const customization = await this.customizationCreator.create(
          { productId: item.productId.value, ...dto.customization },
          dto.userId,
          tx,
        );
        if (customization.productId !== item.productId.value) {
          throw new Error(
            'Created customization does not belong to the cart item product',
          );
        }
        customizationIdList = [customization.id];
      }

      // 6. Update the item, preserving the snapshot.
      const updatedItem: CartItemEntity = {
        ...item,
        quantity: quantity.value,
        ...(customizationIdList !== undefined && { customizationIdList }),
      };
      const updatedItems = cart.items.map((i: CartItemEntity) =>
        i.id === item.id ? updatedItem : i,
      );

      await this.cartRepository.save(
        {
          ...cart,
          items: updatedItems,
          updatedAt: new Date(),
        },
        tx,
      );

      // 7. Emit event.
      await this.outboxRepository.saveEvent(
        GlobalEvents.CART_ITEM_UPDATED,
        {
          cartId: cart.id,
          itemId: updatedItem.id,
          quantity: updatedItem.quantity,
          occurredAt: new Date().toISOString(),
        },
        tx,
      );

      return updatedItem;
    });
  }
}
