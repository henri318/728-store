'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import styles from './add-to-cart-button.module.css';

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  imageUrl?: string | null;
  disabled?: boolean;
}

type ButtonState = 'idle' | 'adding' | 'success' | 'error';

interface CartItemInfo {
  cartItemId: string;
  quantity: number;
}

const MAX_QUANTITY = 99;

/**
 * Reusable "Add to Cart" button with quantity controls.
 *
 * - When the product is NOT in the cart: shows a standard "Add to Cart" button.
 * - When the product IS in the cart: shows [-] quantity [+] controls.
 *
 * Guest users: uses GuestCartContext (localStorage).
 * Authenticated users: fetches cart from /api/cart, uses PATCH/DELETE API calls.
 */
export function AddToCartButton({
  productId,
  productName,
  sellerId,
  sellerName,
  price,
  imageUrl = null,
  disabled = false,
}: AddToCartButtonProps) {
  const { status } = useSession();
  const { items, addItem, updateQuantity, removeItem } = useGuestCart();
  const isAuthenticated = status === 'authenticated';

  const [state, setState] = useState<ButtonState>('idle');
  const [cartItemInfo, setCartItemInfo] = useState<CartItemInfo | null>(null);

  // ─── Fetch cart for authenticated users ────────────────────────────
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
        // Silently ignore — show "Add to Cart" as fallback.
      }
    }

    fetchCart();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, productId]);

  // ─── Determine current quantity ────────────────────────────────────
  const currentQuantity =
    state === 'success' && cartItemInfo
      ? cartItemInfo.quantity
      : !isAuthenticated
        ? (items.find((i) => i.productId === productId)?.quantity ?? 0)
        : (cartItemInfo?.quantity ?? 0);

  const isInCart = currentQuantity > 0;

  // ─── Refresh cart after adding (authenticated) ─────────────────────
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
      // Silently ignore.
    }
  }, [isAuthenticated, productId]);

  // ─── Add to cart ───────────────────────────────────────────────────
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

        // Refresh cart in background for authenticated users.
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

  // ─── Increment quantity ────────────────────────────────────────────
  const handleIncrement = useCallback(async () => {
    if (!isInCart || currentQuantity >= MAX_QUANTITY) return;
    const newQty = currentQuantity + 1;

    if (isAuthenticated && cartItemInfo) {
      // Optimistic update.
      setCartItemInfo({ ...cartItemInfo, quantity: newQty });
      try {
        const res = await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          // Revert on failure.
          setCartItemInfo(cartItemInfo);
        }
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

  // ─── Decrement quantity ────────────────────────────────────────────
  const handleDecrement = useCallback(async () => {
    if (!isInCart) return;

    if (currentQuantity <= 1) {
      // Remove from cart.
      if (isAuthenticated && cartItemInfo) {
        const prev = cartItemInfo;
        setCartItemInfo(null);
        try {
          const res = await fetch(
            `/api/cart/items/${cartItemInfo.cartItemId}`,
            { method: 'DELETE' },
          );
          if (!res.ok) setCartItemInfo(prev);
        } catch {
          setCartItemInfo(prev);
        }
      } else {
        removeItem(productId);
      }
    } else {
      const newQty = currentQuantity - 1;
      if (isAuthenticated && cartItemInfo) {
        setCartItemInfo({ ...cartItemInfo, quantity: newQty });
        try {
          const res = await fetch(
            `/api/cart/items/${cartItemInfo.cartItemId}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity: newQty }),
            },
          );
          if (!res.ok) {
            setCartItemInfo(cartItemInfo);
          }
        } catch {
          setCartItemInfo(cartItemInfo);
        }
      } else {
        updateQuantity(productId, newQty);
      }
    }
  }, [
    isInCart,
    currentQuantity,
    isAuthenticated,
    cartItemInfo,
    productId,
    removeItem,
    updateQuantity,
  ]);

  // ─── Button label ──────────────────────────────────────────────────
  const buttonLabel =
    state === 'adding'
      ? 'Adding…'
      : state === 'success'
        ? 'Added ✓'
        : state === 'error'
          ? 'Error — Try again'
          : 'Add to Cart';

  // ─── Render ────────────────────────────────────────────────────────

  // Show success/error feedback overlay.
  if (state === 'success' || state === 'error') {
    return (
      <button
        type="button"
        className={`${styles.button} ${state === 'success' ? styles.success : ''} ${state === 'error' ? styles.error : ''}`}
        disabled
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>
    );
  }

  // Quantity controls when product is in cart.
  if (isInCart) {
    return (
      <div className={styles.quantityControls}>
        <button
          type="button"
          className={styles.quantityButton}
          onClick={handleDecrement}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className={styles.quantityDisplay} aria-live="polite">
          {currentQuantity}
        </span>
        <button
          type="button"
          className={styles.quantityButton}
          onClick={handleIncrement}
          disabled={currentQuantity >= MAX_QUANTITY}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    );
  }

  // Default: "Add to Cart" button.
  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleAdd}
      disabled={disabled}
      aria-label={buttonLabel}
    >
      {buttonLabel}
    </button>
  );
}
