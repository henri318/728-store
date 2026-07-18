import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
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
  const [items, setItems] = useState<CartApiItem[]>([]);
  const [optimisticItem, setOptimisticItem] = useState<{
    key: string;
    item: CartItemInfo | null;
  } | null>(null);
  const matchKey = JSON.stringify({
    isAuthenticated,
    productId,
    editCartItemId,
    customization,
  });
  const matchedItem = useMemo(() => {
    if (!isAuthenticated) return null;
    return editCartItemId
      ? findCartItemById(items, editCartItemId)
      : findCartItemInfo(items, productId, customization);
  }, [customization, editCartItemId, isAuthenticated, items, productId]);
  const cartItemInfo =
    optimisticItem?.key === matchKey ? optimisticItem.item : matchedItem;
  const productInCart =
    !editCartItemId &&
    cartItemInfo === null &&
    isAuthenticated &&
    items.some((item) => item.productId === productId);

  const updateCart = useCallback((nextItems: CartApiItem[]) => {
    setItems(nextItems);
    setOptimisticItem(null);
  }, []);

  const setCartItemInfo = useCallback<
    Dispatch<SetStateAction<CartItemInfo | null>>
  >(
    (nextItem) => {
      setOptimisticItem((current) => {
        const currentItem =
          current?.key === matchKey ? current.item : matchedItem;
        return {
          key: matchKey,
          item:
            typeof nextItem === 'function' ? nextItem(currentItem) : nextItem,
        };
      });
    },
    [matchKey, matchedItem],
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
