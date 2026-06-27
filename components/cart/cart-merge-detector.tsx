'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { MergeDialog } from '@/components/cart/merge-dialog';

/**
 * Detects when a guest with items logs in.
 * If the server also has items, shows the MergeDialog to let the user choose.
 * If the server is empty, auto-merges the guest cart without asking.
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

    async function checkAndMerge() {
      try {
        const res = await fetch('/api/cart');
        if (!res.ok) return;
        const data = await res.json();

        if (data.items && data.items.length > 0) {
          // Server has items too - show merge dialog
          setShowMerge(true);
        } else {
          // Server is empty - auto-merge silently
          try {
            await fetch('/api/cart/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: guestItems.map((gi) => ({
                  productId: gi.productId,
                  sellerId: gi.sellerId,
                  quantity: gi.quantity,
                  unitPriceSnapshot: gi.unitPriceSnapshot,
                })),
                strategy: 'merge',
              }),
            });
            window.location.reload();
          } catch {
            // Ignore - let user retry manually
          }
        }
      } catch {
        // Ignore — don't show dialog on network error
      }
    }

    checkAndMerge();
  }, [status, guestItems]);

  return <MergeDialog isOpen={showMerge} onClose={() => setShowMerge(false)} />;
}
