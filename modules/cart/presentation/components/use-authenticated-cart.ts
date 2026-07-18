import { useCallback, useEffect, useState } from 'react';
import { findCartItemById, findCartItemInfo } from './cart-item-matching';
import { fetchAuthenticatedCart, type CartApiItem } from './cart-api';
import type { CartItemInfo } from './add-to-cart-types';
import type { CustomizationDraftPayload } from './customization-draft-schema';

interface AuthenticatedCartOptions {
  isAuthenticated: boolean;
  productId: string;
  editCartItemId?: string;
  customization: CustomizationDraftPayload;
}

export function useAuthenticatedCart({
  isAuthenticated,
  productId,
  editCartItemId,
  customization,
}: AuthenticatedCartOptions) {
  const [cartItemInfo, setCartItemInfo] = useState<CartItemInfo | null>(null);
  const [productInCart, setProductInCart] = useState(false);

  const updateCart = useCallback(
    (items: CartApiItem[]) => {
      const found = editCartItemId
        ? findCartItemById(items, editCartItemId)
        : findCartItemInfo(items, productId, customization);
      setCartItemInfo(found);
      setProductInCart(
        !editCartItemId &&
          found === null &&
          items.some((item) => item.productId === productId),
      );
    },
    [customization, editCartItemId, productId],
  );

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const items = await fetchAuthenticatedCart();
      if (items) updateCart(items);
    } catch {
      // Keep the existing button state when the cart cannot be loaded.
    }
  }, [isAuthenticated, updateCart]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;
    async function loadCart() {
      try {
        const items = await fetchAuthenticatedCart();
        if (items && !isCancelled) updateCart(items);
      } catch {
        // Keep the add state when the initial cart request fails.
      }
    }
    loadCart();
    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, updateCart]);

  return { cartItemInfo, productInCart, setCartItemInfo, refreshCart };
}
