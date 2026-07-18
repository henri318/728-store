import type { CartRepository } from '../domain/cart-repository';
import { loadAndVerifyCart } from './cart-access';
import { Quantity } from '../domain/value-objects/quantity';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { CartItemEntity } from '../domain/entities/cart-item';
import type { CustomizationLookupPort } from '../domain/customization-lookup-port';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import type {
  CustomerCustomizationCreatePort,
  CustomerCustomizationInput,
} from '../domain/customer-customization-create-port';
import { InvalidCustomizationError } from '../domain/errors';

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
    private customizationLookup: CustomizationLookupPort,
    private txRunner?: TransactionRunner,
    private customizationCreator?: CustomerCustomizationCreatePort,
  ) {}

  private async validateCustomizations(
    customizationIdList: string[],
    productId: string,
  ): Promise<void> {
    const snapshots =
      await this.customizationLookup.findByIds(customizationIdList);

    if (snapshots.length !== customizationIdList.length) {
      throw new InvalidCustomizationError(
        'Some customization IDs do not exist',
        'One or more selected customizations are not available',
      );
    }

    if (snapshots.some((snapshot) => snapshot.productId !== productId)) {
      throw new InvalidCustomizationError(
        `One or more customizations do not belong to product ${productId}`,
        'One or more selected customizations are not available for this product',
      );
    }
  }

  async execute(dto: UpdateCartItemQuantityDTO): Promise<CartItemEntity> {
    if (dto.customization && !this.customizationCreator) {
      throw new Error('Customer customization creator is not configured');
    }
    if (dto.customization && !this.txRunner) {
      throw new Error(
        'Transaction runner is required for customer customization',
      );
    }

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

      let customizationIdList = dto.customizationIdList
        ? [...new Set(dto.customizationIdList)]
        : undefined;
      if (customizationIdList) {
        await this.validateCustomizations(
          customizationIdList,
          item.productId.value,
        );
      }

      if (dto.customization) {
        if (!tx || typeof tx !== 'object') {
          throw new Error('Transaction runner did not provide a transaction');
        }
        const customization = await this.customizationCreator!.create(
          { productId: item.productId.value, ...dto.customization },
          dto.userId,
          tx,
        );
        if (customization.productId !== item.productId.value) {
          throw new InvalidCustomizationError(
            `Customization ${customization.id} does not belong to product ${item.productId.value}`,
            'Customization is not available for this product',
          );
        }
        customizationIdList = [
          ...new Set([...(customizationIdList ?? []), customization.id]),
        ];
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
