'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { QuantityControls } from '@/shared/ui/quantity-controls';
import styles from './add-to-cart-button.module.css';

export interface CartButtonLabels {
  addToCart: string;
  removeFromCart: string;
  adding: string;
  added: string;
  error: string;
  increaseQuantity: string;
  decreaseQuantity: string;
}

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  imageUrl?: string | null;
  disabled?: boolean;
  labels: CartButtonLabels;
}

interface CartItemInfo {
  cartItemId: string;
  quantity: number;
}

type ButtonState = 'idle' | 'adding' | 'success' | 'error';
const MAX_QUANTITY = 99;
const CART_UPDATED_EVENT = 'cart:updated';

function dispatchCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

/**
 * Cart button with quantity controls.
 *
 * - Not in cart → "Add to Cart" button.
 * - In cart → [- qty +] + "Remove" button.
 *
 * Guest: GuestCartContext. Auth: API calls.
 */
export function AddToCartButton({
  productId,
  productName,
  sellerId,
  sellerName,
  price,
  imageUrl = null,
  disabled = false,
  labels,
}: AddToCartButtonProps) {
  const { status } = useSession();
  const { items, addItem, updateQuantity, removeItem } = useGuestCart();
  const isAuthenticated = status === 'authenticated';

  const [state, setState] = useState<ButtonState>('idle');
  const [cartItemInfo, setCartItemInfo] = useState<CartItemInfo | null>(null);

  // Fetch cart for authenticated users.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function fetchCart() {
      try {
        const res = await fetch('/api/cart');
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const found = data.items?.find(
          (item: { productId: string }) => item.productId === productId,
        );
        setCartItemInfo(
          found ? { cartItemId: found.id, quantity: found.quantity } : null,
        );
      } catch {
        /* fallback to "Add to Cart" */
      }
    }

    fetchCart();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, productId]);

  // Determine current quantity.
  const currentQuantity = !isAuthenticated
    ? (items.find((i) => i.productId === productId)?.quantity ?? 0)
    : (cartItemInfo?.quantity ?? 0);

  const isInCart = currentQuantity > 0;

  // Refresh cart after add (authenticated).
  const refreshCartForProduct = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) return;
      const data = await res.json();
      const found = data.items?.find(
        (item: { productId: string }) => item.productId === productId,
      );
      setCartItemInfo(
        found ? { cartItemId: found.id, quantity: found.quantity } : null,
      );
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, productId]);

  const handleAdd = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (state === 'adding' || disabled) return;
      setState('adding');

      try {
        if (isAuthenticated) {
          const res = await fetch('/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity: 1 }),
          });
          if (!res.ok) {
            setState('error');
            setTimeout(() => setState('idle'), 3000);
            return;
          }
        } else {
          addItem({
            productId,
            sellerId,
            quantity: 1,
            unitPriceSnapshot: price,
            productName,
            sellerName,
            productImageUrl: imageUrl,
          });
        }
        setState('success');
        setTimeout(() => setState('idle'), 2000);
        dispatchCartUpdated();
        refreshCartForProduct();
      } catch {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    },
    [
      state,
      disabled,
      isAuthenticated,
      productId,
      sellerId,
      price,
      productName,
      sellerName,
      imageUrl,
      addItem,
      refreshCartForProduct,
    ],
  );

  const handleIncrement = useCallback(async () => {
    if (!isInCart || currentQuantity >= MAX_QUANTITY) return;
    const newQty = currentQuantity + 1;
    if (isAuthenticated && cartItemInfo) {
      setCartItemInfo({ ...cartItemInfo, quantity: newQty });
      try {
        const res = await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          setCartItemInfo(cartItemInfo);
          return;
        }
        dispatchCartUpdated();
      } catch {
        setCartItemInfo(cartItemInfo);
      }
    } else {
      updateQuantity(productId, newQty);
    }
  }, [
    isInCart,
    currentQuantity,
    isAuthenticated,
    cartItemInfo,
    productId,
    updateQuantity,
  ]);

  const handleDecrement = useCallback(async () => {
    if (!isInCart) return;
    if (currentQuantity <= 1) return; // use explicit remove button

    const newQty = currentQuantity - 1;
    if (isAuthenticated && cartItemInfo) {
      setCartItemInfo({ ...cartItemInfo, quantity: newQty });
      try {
        const res = await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          setCartItemInfo(cartItemInfo);
          return;
        }
        dispatchCartUpdated();
      } catch {
        setCartItemInfo(cartItemInfo);
      }
    } else {
      updateQuantity(productId, newQty);
    }
  }, [
    isInCart,
    currentQuantity,
    isAuthenticated,
    cartItemInfo,
    productId,
    updateQuantity,
  ]);

  const handleRemove = useCallback(async () => {
    if (isAuthenticated && cartItemInfo) {
      const prev = cartItemInfo;
      setCartItemInfo(null);
      try {
        const res = await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          setCartItemInfo(prev);
          return;
        }
        dispatchCartUpdated();
      } catch {
        setCartItemInfo(prev);
      }
    } else {
      removeItem(productId);
    }
  }, [isAuthenticated, cartItemInfo, productId, removeItem]);

  const feedbackLabel =
    state === 'adding'
      ? labels.adding
      : state === 'success'
        ? labels.added
        : state === 'error'
          ? labels.error
          : labels.addToCart;

  // Success / Error feedback.
  if (state === 'success' || state === 'error') {
    return (
      <button
        type="button"
        className={`${styles.button} ${state === 'success' ? styles.success : styles.error}`}
        disabled
        aria-label={feedbackLabel}
      >
        {feedbackLabel}
      </button>
    );
  }

  // In cart: quantity controls + remove button.
  if (isInCart) {
    return (
      <div className={styles.quantityRow}>
        <QuantityControls
          value={currentQuantity}
          onChange={(newQty) => {
            if (newQty > currentQuantity) handleIncrement();
            else if (newQty < currentQuantity) handleDecrement();
          }}
          variant="compact"
          decrementLabel={labels.decreaseQuantity}
          incrementLabel={labels.increaseQuantity}
        />
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleRemove}
          aria-label={labels.removeFromCart}
        >
          <svg aria-hidden="true" width="36" height="36">
            <use href="/img/icons/sprites.svg#icon-trash" />
          </svg>
        </button>
      </div>
    );
  }

  // Default: "Add to Cart".
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${state === 'adding' ? styles.loading : ''}`}
      onClick={handleAdd}
      disabled={disabled || state === 'adding'}
      aria-label={feedbackLabel}
    >
      <svg aria-hidden="true" width="40" height="40">
        <use href="/img/icons/sprites.svg#icon-add" />
      </svg>
    </button>
  );
}
