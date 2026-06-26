'use client';

import { useState, useCallback } from 'react';
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

/**
 * Reusable "Add to Cart" button.
 *
 * - Authenticated users: POSTs to `/api/cart/items`.
 * - Guest users: adds to GuestCartContext (localStorage).
 *
 * Shows loading, success, and error feedback via button text changes.
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
  const { addItem } = useGuestCart();
  const [state, setState] = useState<ButtonState>('idle');

  const isAuthenticated = status === 'authenticated';

  const handleClick = useCallback(
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
        // Reset to idle after 2 seconds
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
        // Reset to idle after 3 seconds
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
    ],
  );

  const label =
    state === 'adding'
      ? 'Adding…'
      : state === 'success'
        ? 'Added ✓'
        : state === 'error'
          ? 'Error — Try again'
          : 'Add to Cart';

  return (
    <button
      type="button"
      className={`${styles.button} ${state === 'success' ? styles.success : ''} ${state === 'error' ? styles.error : ''}`}
      onClick={handleClick}
      disabled={disabled || state === 'adding'}
      aria-label={label}
    >
      {label}
    </button>
  );
}
