import { useCallback } from 'react';
import { dispatchCartUpdated } from '@/modules/cart/presentation/cart-events';
import {
  addAuthenticatedCartItem,
  removeAuthenticatedCartItem,
  updateAuthenticatedCartItem,
} from './cart-api';
import { hasCustomizationContent } from './cart-item-matching';
import type { CartItemInfo } from './add-to-cart-types';
import type { CustomizationDraftPayload } from './customization-draft-schema';

interface AuthenticatedCartActionsOptions {
  productId: string;
  cartItemInfo: CartItemInfo | null;
  setCartItemInfo: React.Dispatch<React.SetStateAction<CartItemInfo | null>>;
  onFailure: () => void;
}

export function useAuthenticatedCartActions({
  productId,
  cartItemInfo,
  setCartItemInfo,
  onFailure,
}: AuthenticatedCartActionsOptions) {
  const addItem = useCallback(
    async (draft: CustomizationDraftPayload) => {
      return addAuthenticatedCartItem(
        productId,
        hasCustomizationContent(draft) ? draft : null,
      );
    },
    [productId],
  );

  const updateQuantity = useCallback(
    async (nextQuantity: number) => {
      if (!cartItemInfo) return;
      const previous = cartItemInfo;
      setCartItemInfo({ ...cartItemInfo, quantity: nextQuantity });
      try {
        if (
          await updateAuthenticatedCartItem(cartItemInfo.cartItemId, {
            quantity: nextQuantity,
          })
        ) {
          dispatchCartUpdated();
          return;
        }
      } catch {
        // Restore the optimistic quantity below.
      }
      setCartItemInfo((current) =>
        current?.cartItemId === previous.cartItemId &&
        current.quantity === nextQuantity
          ? previous
          : current,
      );
      onFailure();
    },
    [cartItemInfo, onFailure, setCartItemInfo],
  );

  const saveDesign = useCallback(
    async (draft: CustomizationDraftPayload) => {
      if (!cartItemInfo) return;
      try {
        const updated = await updateAuthenticatedCartItem(
          cartItemInfo.cartItemId,
          {
            quantity: cartItemInfo.quantity,
            customization: draft,
          },
        );
        if (updated) dispatchCartUpdated();
        else onFailure();
      } catch {
        onFailure();
      }
    },
    [cartItemInfo, onFailure],
  );

  const removeItem = useCallback(async () => {
    if (!cartItemInfo) return;
    const previous = cartItemInfo;
    setCartItemInfo(null);
    try {
      if (await removeAuthenticatedCartItem(cartItemInfo.cartItemId)) {
        dispatchCartUpdated();
        return;
      }
    } catch {
      // Restore the optimistic removal below.
    }
    setCartItemInfo((current) => (current === null ? previous : current));
    onFailure();
  }, [cartItemInfo, onFailure, setCartItemInfo]);

  return { addItem, updateQuantity, saveDesign, removeItem };
}
