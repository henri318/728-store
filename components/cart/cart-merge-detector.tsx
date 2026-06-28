'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { MergeDialog } from '@/components/cart/merge-dialog';

const CART_UPDATED_EVENT = 'cart:updated';

interface CartMergeDetectorLabels {
  mergeTitle: string;
  mergeDescription: string;
  mergeBoth: string;
  mergeBothHint: string;
  keepServerCart: string;
  keepServerHint: string;
  keepGuestCart: string;
  keepGuestHint: string;
}

/**
 * Detects when a guest with items logs in.
 * If the server also has items, shows the MergeDialog to let the user choose.
 * If the server is empty, auto-merges the guest cart without asking.
 */
export function CartMergeDetector({
  labels,
}: {
  labels: CartMergeDetectorLabels;
}) {
  const { status } = useSession();
  const router = useRouter();
  const guestCart = useGuestCart();
  const guestItems = guestCart.items;
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
            const res = await fetch('/api/cart/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                guestItems: guestItems,
                strategy: 'merge',
              }),
            });
            if (!res.ok) return;
            // Clear guest cart after successful migration
            guestCart.clearCart();
            window.dispatchEvent(new Event(CART_UPDATED_EVENT));
            router.refresh();
          } catch {
            // Ignore - let user retry manually
          }
        }
      } catch {
        // Ignore — don't show dialog on network error
      }
    }

    checkAndMerge();
  }, [status, guestItems, guestCart, router]);

  return (
    <MergeDialog
      isOpen={showMerge}
      onClose={() => setShowMerge(false)}
      labels={{
        title: labels.mergeTitle,
        description: labels.mergeDescription,
        mergeBoth: labels.mergeBoth,
        mergeBothHint: labels.mergeBothHint,
        keepServerCart: labels.keepServerCart,
        keepServerHint: labels.keepServerHint,
        keepGuestCart: labels.keepGuestCart,
        keepGuestHint: labels.keepGuestHint,
      }}
    />
  );
}
