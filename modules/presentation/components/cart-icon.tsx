'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import styles from './header-nav.module.css';

interface CartIconProps {
  alt: string;
}

/**
 * Cart icon with item count badge.
 *
 * - Guest users: reads count from GuestCartContext (localStorage).
 * - Authenticated users: fetches count from GET /api/cart on mount.
 *
 * The count represents distinct line items (not sum of quantities).
 * The badge is hidden when the count is 0.
 */
export function CartIcon({ alt }: CartIconProps) {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] ?? 'es';
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // Guest cart (always available; itemCount is 0 before hydration — safe for SSR).
  const { itemCount: guestCount } = useGuestCart();

  // Authenticated cart count (fetched from API).
  const [authCount, setAuthCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch('/api/cart');
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setAuthCount(Array.isArray(data.items) ? data.items.length : 0);
        }
      } catch {
        // Silently ignore — badge stays hidden.
      }
    }

    fetchCount();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const count = isAuthenticated ? authCount : guestCount;

  return (
    <Link href={`/${locale}/cart`} className={styles.cartIconWrapper}>
        <Image
          src="/img/icons/iconos-04.svg"
          alt={alt}
          width={62}
          height={62}
          className={styles.userIcon}
        />
      {count > 0 && (
        <span className={styles.badge} title="Cart items">
          {count}
        </span>
      )}
    </Link>
  );
}
