'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { useCartPopup } from './cart-popup-context';
import styles from './header-nav.module.css';

const CART_UPDATED_EVENT = 'cart:updated';

interface CartIconProps {
  alt: string;
}

export function CartIcon({ alt }: CartIconProps) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const { itemCount: guestCount } = useGuestCart();
  const { open } = useCartPopup();
  const [authCount, setAuthCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch('/api/cart');
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (!cancelled)
          setAuthCount(
            Array.isArray(data.items)
              ? data.items.reduce(
                  (sum: number, item: { quantity?: number }) =>
                    sum + (item.quantity ?? 1),
                  0,
                )
              : 0,
          );
      } catch {
        /* ignore */
      }
    }

    fetchCount();

    const handleCartUpdated = () => {
      fetchCount();
    };
    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [isAuthenticated]);

  const count = isAuthenticated ? authCount : guestCount;

  return (
    <button
      type="button"
      onClick={open}
      className={styles.cartIconWrapper}
      aria-label={`${alt}${count > 0 ? ` (${count})` : ''}`}
    >
      <svg
        className={styles.userIcon}
        aria-hidden="true"
        width="62"
        height="62"
      >
        <use href="/img/sprites.svg#icon-cart" />
      </svg>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  );
}
