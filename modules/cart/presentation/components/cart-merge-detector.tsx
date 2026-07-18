'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { MergeDialog } from './merge-dialog';
import { dispatchCartUpdated } from '@/modules/cart/presentation/cart-events';
import { canUseAuthenticatedCart } from '@/modules/cart/presentation/cart-capability';

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

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const guestCart = useGuestCart();
  const guestItems = guestCart.items;
  const [showMerge, setShowMerge] = useState(false);
  const hasCheckedRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);
  const canUseCart = canUseAuthenticatedCart(session?.user?.role);

  useEffect(() => {
    if (status !== 'authenticated' || !canUseCart || hasCheckedRef.current)
      return;
    if (guestItems.length === 0) return;

    hasCheckedRef.current = true;
    const controller = new AbortController();
    let isComplete = false;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = () => {
      if (controller.signal.aborted) return;
      hasCheckedRef.current = false;
      retryTimeout = setTimeout(
        // eslint-disable-next-line sonarjs/no-nested-functions
        () => setRetryCount((current) => current + 1),
        Math.min(1000 * 2 ** retryCount, 30_000),
      );
    };

    async function checkAndMerge() {
      try {
        const res = await fetch('/api/cart', { signal: controller.signal });
        if (!res.ok && shouldRetry(res.status)) {
          scheduleRetry();
          return;
        }
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (data.items && data.items.length > 0) {
          // Server has items too - show merge dialog
          isComplete = true;
          setShowMerge(true);
        } else {
          // Server is empty - auto-merge silently
          try {
            const res = await fetch('/api/cart/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                guestItems: guestItems,
                strategy: 'merge',
              }),
            });
            if (!res.ok && shouldRetry(res.status)) {
              scheduleRetry();
              return;
            }
            if (controller.signal.aborted) return;
            // Clear guest cart after successful migration
            isComplete = true;
            guestCart.clearCart();
            dispatchCartUpdated();
            router.refresh();
          } catch {
            scheduleRetry();
          }
        }
      } catch {
        scheduleRetry();
      }
    }

    checkAndMerge();
    return () => {
      controller.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
      if (!isComplete) hasCheckedRef.current = false;
    };
  }, [status, canUseCart, guestItems, guestCart, router, retryCount]);

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
