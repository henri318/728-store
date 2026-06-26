'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { useCartPopup } from './cart-popup-context';
import styles from './header-nav.module.css';

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
          setAuthCount(Array.isArray(data.items) ? data.items.length : 0);
      } catch {
        /* ignore */
      }
    }
    fetchCount();
    return () => {
      cancelled = true;
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
      <Image
        src="/img/icons/iconos-04.svg"
        alt={alt}
        width={62}
        height={62}
        className={styles.userIcon}
      />
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  );
}
