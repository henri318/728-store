import { useCallback } from 'react';
import type { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import type { AddToCartButtonProps } from './add-to-cart-types';
import type { CustomizationDraftPayload } from './customization-draft-schema';

interface GuestCartActionsOptions {
  cart: ReturnType<typeof useGuestCart>;
  match: ReturnType<typeof useGuestCart>['items'][number] | undefined;
  props: AddToCartButtonProps;
}

export function useGuestCartActions({
  cart,
  match,
  props,
}: GuestCartActionsOptions) {
  const addItem = useCallback(
    (draft: CustomizationDraftPayload) => {
      cart.addItem({
        productId: props.productId,
        sellerId: props.sellerId,
        quantity: 1,
        unitPriceSnapshot: props.price,
        productName: props.productName,
        sellerName: props.sellerName,
        productImageUrl: props.imageUrl ?? null,
        customizationText: draft.text,
        customizationColor: draft.color,
        customizationSize: draft.size,
        customizationImageUrl: draft.imageUrl,
        customizationImageUploadId: draft.imageUploadId,
        customizationDesignPosition: draft.designPosition ?? null,
      });
    },
    [cart, props],
  );

  const updateQuantity = useCallback(
    (quantity: number) => {
      if (match?.id) cart.updateItemQuantity(match.id, quantity);
    },
    [cart, match],
  );

  const saveDesign = useCallback(
    (draft: CustomizationDraftPayload) => {
      if (!match?.id) return;
      cart.updateItemCustomization(match.id, {
        text: draft.text,
        color: draft.color,
        size: draft.size,
        imageUrl: draft.imageUrl,
        imageUploadId: draft.imageUploadId,
        designPosition: draft.designPosition ?? null,
      });
    },
    [cart, match],
  );

  const removeItem = useCallback(() => {
    if (match?.id) cart.removeItemById(match.id);
  }, [cart, match]);

  return { addItem, updateQuantity, saveDesign, removeItem };
}
