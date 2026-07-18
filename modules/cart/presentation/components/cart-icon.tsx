'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { useCartPopup } from './cart-popup-context';
import { CART_UPDATED_EVENT } from '@/modules/cart/presentation/cart-events';
import { canUseAuthenticatedCart } from '@/modules/cart/presentation/cart-capability';
import styles from '@/shared/layout/header-nav.module.css';

interface CartIconProps {
  alt: string;
}

export function CartIcon({ alt }: CartIconProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const canUseCart =
    isAuthenticated && canUseAuthenticatedCart(session?.user?.role);
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

  const handleCartUpdated = useCallback(() => {
    void fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!canUseCart) return;
    globalThis.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    Promise.try(fetchCount);

    return () => {
      abortRef.current?.abort();
      globalThis.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [canUseCart, fetchCount, handleCartUpdated]);

  if (isAuthenticated && !canUseCart) return null;

  const count = isAuthenticated ? authCount : guestCount;

  return (
    <button
      type="button"
      onClick={open}
      className={styles.cartIconWrapper}
      aria-label={count > 0 ? `${alt} (${count})` : alt}
    >
      <svg className={styles.userIcon} aria-hidden="true">
        <use href="/img/icons/sprites.svg#icon-cart" />
      </svg>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  );
}
