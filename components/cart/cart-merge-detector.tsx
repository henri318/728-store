'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { MergeDialog } from '@/components/cart/merge-dialog';

/**
 * Detects when a guest with items logs in and the server also has items.
 * Shows the MergeDialog to let the user choose how to combine carts.
 */
export function CartMergeDetector() {
  const { status } = useSession();
  const { items: guestItems } = useGuestCart();
  const [showMerge, setShowMerge] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || hasCheckedRef.current) return;
    if (guestItems.length === 0) return;

    hasCheckedRef.current = true;

    async function checkServerCart() {
      try {
        const res = await fetch('/api/cart');
        if (!res.ok) return;
        const data = await res.json();

        if (data.items && data.items.length > 0) {
          setShowMerge(true);
        }
      } catch {
        // Ignore — don't show dialog on network error
      }
    }

    checkServerCart();
  }, [status, guestItems.length]);

  return <MergeDialog isOpen={showMerge} onClose={() => setShowMerge(false)} />;
}
