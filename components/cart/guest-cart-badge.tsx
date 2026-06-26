'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import styles from './guest-cart-badge.module.css';

/**
 * Small header badge showing the guest cart item count.
 *
 * Only renders when:
 *  - The user is NOT authenticated (guests only).
 *  - The guest cart has at least 1 item.
 *
 * Links to `/{locale}/cart` so the guest can review their cart.
 */
export function GuestCartBadge() {
  const { status } = useSession();
  const { itemCount } = useGuestCart();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] ?? 'es';

  if (status !== 'unauthenticated' || itemCount === 0) {
    return null;
  }

  return (
    <a href={`/${locale}/cart`} className={styles.badge} aria-label="Cart">
      <span className={styles.count}>{itemCount}</span>
    </a>
  );
}
