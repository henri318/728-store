'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/modules/presentation/components/modal';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import type { MergeStrategy } from '@/modules/cart/application/migrate-guest-cart';
import styles from './merge-dialog.module.css';

const CART_UPDATED_EVENT = 'cart:updated';

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  labels: {
    title: string;
    description: string;
    mergeBoth: string;
    mergeBothHint: string;
    keepServerCart: string;
    keepServerHint: string;
    keepGuestCart: string;
    keepGuestHint: string;
  };
}

/**
 * Modal dialog shown when a guest with items in localStorage logs in
 * and the server already has a cart.
 *
 * Three options:
 *  - "Merge both"       → combine server + guest items
 *  - "Keep server cart" → discard guest items
 *  - "Keep guest cart"  → replace server items with guest items
 *
 * On choice: POSTs to /api/cart/migrate, clears localStorage, refreshes
 * the server cart, and dismisses the dialog.
 */
export function MergeDialog({ isOpen, onClose, labels }: MergeDialogProps) {
  const { items, clearCart } = useGuestCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChoice = async (strategy: MergeStrategy) => {
    setLoading(true);
    try {
      const res = await fetch('/api/cart/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestItems: items,
          strategy,
        }),
      });

      if (res.ok) {
        clearCart();
        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
        router.refresh();
        onClose();
      }
    } catch {
      // Network error — leave the dialog open so the user can retry.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.dialog}>
        <h2 className={styles.title}>{labels.title}</h2>
        <p className={styles.description}>{labels.description}</p>

        <div className={styles.actions}>
          <button
            className={styles.optionButton}
            onClick={() => handleChoice('merge')}
            disabled={loading}
          >
            <strong>{labels.mergeBoth}</strong>
            <span className={styles.hint}>{labels.mergeBothHint}</span>
          </button>

          <button
            className={styles.optionButton}
            onClick={() => handleChoice('keep-server')}
            disabled={loading}
          >
            <strong>{labels.keepServerCart}</strong>
            <span className={styles.hint}>{labels.keepServerHint}</span>
          </button>

          <button
            className={styles.optionButton}
            onClick={() => handleChoice('keep-guest')}
            disabled={loading}
          >
            <strong>{labels.keepGuestCart}</strong>
            <span className={styles.hint}>{labels.keepGuestHint}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
