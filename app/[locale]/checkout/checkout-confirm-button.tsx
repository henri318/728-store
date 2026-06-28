'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { Modal } from '@/modules/presentation/components/modal';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import styles from './checkout-confirm-button.module.css';

interface PriceChange {
  itemId: string;
  oldPrice: number;
  newPrice: number;
}

interface CheckoutConfirmButtonProps {
  locale: string;
}

/**
 * Client component for the checkout confirmation flow.
 *
 * 1. POST /api/cart/checkout → preview totals.
 * 2. If 200 → POST /api/cart/checkout/confirm with acceptPriceChanges=false.
 * 3. If 409 → show price-change dialog; user can accept or cancel.
 * 4. On success → redirect to /orders/{orderId} and clear guest cart.
 */
export function CheckoutConfirmButton({ locale }: CheckoutConfirmButtonProps) {
  const router = useRouter();
  const { clearCart } = useGuestCart();
  const [loading, setLoading] = useState(false);
  const [priceChanges, setPriceChanges] = useState<PriceChange[] | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const previewRes = await fetch('/api/cart/checkout', { method: 'POST' });

      if (previewRes.status === 409) {
        const data = await previewRes.json();
        setPriceChanges(data.priceChanges ?? []);
        setLoading(false);
        return;
      }

      if (!previewRes.ok) {
        setLoading(false);
        return;
      }

      // Preview OK → confirm immediately (no price changes).
      await confirmCheckout(false);
    } catch {
      setLoading(false);
    }
  };

  const confirmCheckout = async (acceptPriceChanges: boolean) => {
    try {
      const confirmRes = await fetch('/api/cart/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptPriceChanges }),
      });

      if (confirmRes.ok) {
        const data = await confirmRes.json();
        clearCart();
        const firstOrderId = data.orderIds?.[0] ?? '';
        router.push(`/${locale}/orders/${firstOrderId}`);
      }
    } finally {
      setLoading(false);
      setPriceChanges(null);
    }
  };

  return (
    <>
      <button
        className={styles.button}
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Place Order'}
      </button>

      {priceChanges && (
        <Modal isOpen={true} onClose={() => setPriceChanges(null)}>
          <div className={styles.dialog}>
            <h2>Price Change Detected</h2>
            <p>
              The price of some items has changed since you added them to your
              cart:
            </p>
            <ul className={styles.priceList}>
              {priceChanges.map((pc) => (
                <li key={pc.itemId}>
                  {Money.format(pc.oldPrice, Currency.EUR)} →{' '}
                  {Money.format(pc.newPrice, Currency.EUR)}
                </li>
              ))}
            </ul>
            <div className={styles.dialogActions}>
              <button
                className={styles.acceptButton}
                onClick={() => confirmCheckout(true)}
              >
                Accept new prices
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setPriceChanges(null);
                  router.push(`/${locale}/cart`);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
