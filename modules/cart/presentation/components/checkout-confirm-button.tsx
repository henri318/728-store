'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { Modal } from '@/shared/ui/modal';
import { TextField } from '@/shared/ui/text-field';
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
  initialAddress?: AddressFields | null;
}

interface AddressFields {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

/**
 * Client component for the checkout confirmation flow.
 *
 * 1. POST /api/cart/checkout → preview totals.
 * 2. If 200 → POST /api/cart/checkout/confirm with shouldAcceptPriceChanges=false.
 * 3. If 409 → show price-change dialog; user can accept or cancel.
 * 4. On success → redirect to /orders/{orderId} and clear guest cart.
 */
const EMPTY_ADDRESS: AddressFields = {
  street: '',
  city: '',
  postalCode: '',
  country: '',
};

export function CheckoutConfirmButton({
  locale,
  initialAddress,
}: CheckoutConfirmButtonProps) {
  const router = useRouter();
  const { clearCart } = useGuestCart();
  const dict = useDictionary();
  const [loading, setLoading] = useState(false);
  const [priceChanges, setPriceChanges] = useState<PriceChange[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressFields>(
    initialAddress ?? EMPTY_ADDRESS,
  );

  const hasCompleteAddress = Object.values(address).every((value) =>
    value.trim(),
  );

  const persistProfileAddress = async () => {
    if (!hasCompleteAddress) {
      setError(dict.common.completeAddressToContinue);
      return false;
    }

    const profileRes = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (!profileRes.ok) {
      setError(dict.common.unableToSaveAddress);
      return false;
    }

    return true;
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
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
      setError(dict.common.unableToCheckout);
      setLoading(false);
    }
  };

  const confirmCheckout = async (shouldAcceptPriceChanges: boolean) => {
    try {
      const saved = await persistProfileAddress();
      if (!saved) {
        return;
      }

      const confirmRes = await fetch('/api/cart/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shouldAcceptPriceChanges }),
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
      <div className={styles.addressCard}>
        <h3 className={styles.addressTitle}>{dict.common.deliveryAddress}</h3>
        <div className={styles.addressForm}>
          <TextField
            label={dict.auth.street}
            value={address.street}
            onChange={(street) => setAddress((prev) => ({ ...prev, street }))}
          />
          <TextField
            label={dict.auth.city}
            value={address.city}
            onChange={(city) => setAddress((prev) => ({ ...prev, city }))}
          />
          <TextField
            label={dict.auth.postalCode}
            value={address.postalCode}
            onChange={(postalCode) =>
              setAddress((prev) => ({ ...prev, postalCode }))
            }
          />
          <TextField
            label={dict.auth.country}
            value={address.country}
            onChange={(country) => setAddress((prev) => ({ ...prev, country }))}
          />
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <button
          className={styles.button}
          onClick={handleCheckout}
          disabled={loading}
        >
          {loading ? dict.common.processing : dict.common.placeOrder}
        </button>
      </div>

      {priceChanges && (
        <Modal isOpen={true} onClose={() => setPriceChanges(null)}>
          <div className={styles.dialog}>
            <h2>{dict.common.priceChangeDetected}</h2>
            <p>{dict.common.priceChangeDescription}</p>
            <ul className={styles.priceList}>
              {priceChanges.map((pc) => (
                <li key={pc.itemId}>
                  {Money.format(pc.oldPrice, Currency.EUR)}
                  {'\u{A0}→\u{A0}'}
                  {Money.format(pc.newPrice, Currency.EUR)}
                </li>
              ))}
            </ul>
            <div className={styles.dialogActions}>
              <button
                className={styles.acceptButton}
                onClick={() => confirmCheckout(true)}
              >
                {dict.common.acceptNewPrices}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setPriceChanges(null);
                  router.push(`/${locale}/cart`);
                }}
              >
                {dict.common.cancel}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
