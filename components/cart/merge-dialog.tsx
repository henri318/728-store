'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/modules/presentation/components/modal';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import type { MergeStrategy } from '@/modules/cart/application/migrate-guest-cart';
import styles from './merge-dialog.module.css';

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
export function MergeDialog({ isOpen, onClose }: MergeDialogProps) {
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
        <h2 className={styles.title}>Merge your cart?</h2>
        <p className={styles.description}>
          You have items in your guest cart and an existing cart. What would you
          like to do?
        </p>

        <div className={styles.actions}>
          <button
            className={styles.optionButton}
            onClick={() => handleChoice('merge')}
            disabled={loading}
          >
            <strong>Merge both</strong>
            <span className={styles.hint}>Combine items from both carts</span>
          </button>

          <button
            className={styles.optionButton}
            onClick={() => handleChoice('keep-server')}
            disabled={loading}
          >
            <strong>Keep server cart</strong>
            <span className={styles.hint}>Discard guest cart items</span>
          </button>

          <button
            className={styles.optionButton}
            onClick={() => handleChoice('keep-guest')}
            disabled={loading}
          >
            <strong>Keep guest cart</strong>
            <span className={styles.hint}>
              Replace server cart with guest items
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
