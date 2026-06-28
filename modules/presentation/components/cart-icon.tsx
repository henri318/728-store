'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCount = useCallback(async () => {
    abortRef.current?.abort();
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/cart', { signal: controller.signal });
      if (!res.ok || requestId !== requestIdRef.current) return;
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
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
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- intentional auth cart sync */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCount();

    const handleCartUpdated = () => {
      fetchCount();
    };
    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);

    return () => {
      abortRef.current?.abort();
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [isAuthenticated, fetchCount]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
