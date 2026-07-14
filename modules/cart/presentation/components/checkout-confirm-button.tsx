/* eslint-disable unicorn/no-useless-fallback-in-spread */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { Modal } from '@/shared/ui/modal';
import {
  AddressAutocompleteFields,
  type AddressValue,
} from '@/modules/users/presentation/components/address-autocomplete-fields';
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
  initialAddress?: Partial<AddressFields> | null;
}

type AddressFields = AddressValue;

/**
 * Client component for the checkout confirmation flow.
 *
 * 1. POST /api/cart/checkout → preview totals.
 * 2. If 200 → POST /api/cart/checkout/confirm with shouldAcceptPriceChanges=false.
 * 3. If 409 → show price-change dialog; user can accept or cancel.
 * 4. On success → redirect to /orders/{orderId} and clear guest cart.
 */
const EMPTY_ADDRESS: AddressFields = {};

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
  const [address, setAddress] = useState<AddressFields>({
    ...EMPTY_ADDRESS,
    ...(initialAddress ?? {}),
  });
  const normalizedAddress = {
    ...address,
    country: dict.auth.countryLabel,
    countryCode: 'ES',
  };

  const hasCompleteAddress = [
    normalizedAddress.street,
    normalizedAddress.city,
    normalizedAddress.postalCode,
    normalizedAddress.country,
    normalizedAddress.countryCode,
    normalizedAddress.houseNumber,
  ].every((value) => value?.trim());

  const persistProfileAddress = async () => {
    if (!hasCompleteAddress) {
      setError(dict.common.completeAddressToContinue);
      return false;
    }

    const profileRes = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: normalizedAddress }),
    });

    if (!profileRes.ok) {
      setError(dict.common.unableToSaveAddress);
      return false;
    }

    return true;
  };

  const handleCheckout = async () => {
    if (!hasCompleteAddress) {
      setError(dict.common.completeAddressToContinue);
      return;
    }
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
        body: JSON.stringify({
          acceptPriceChanges: shouldAcceptPriceChanges,
          address: normalizedAddress,
        }),
      });

      if (confirmRes.ok) {
        const data = await confirmRes.json();
        clearCart();
        const firstOrderId = data.orderIds?.[0] ?? '';
        router.push(`/${locale}/orders/${firstOrderId}`);
      } else {
        let payload: { error?: string } = {};
        try {
          payload = await confirmRes.json();
        } catch {
          /* Empty error responses are handled below. */
        }
        setError(payload.error ?? dict.common.unableToCheckout);
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
          <AddressAutocompleteFields
            value={normalizedAddress}
            onChange={setAddress}
            locale={locale === 'cat' ? 'cat' : 'es'}
            labels={{
              street: dict.auth.street,
              houseNumber: dict.auth.houseNumber,
              postalCode: dict.auth.postalCode,
              city: dict.auth.city,
              floor: dict.auth.floor,
              door: dict.auth.door,
              instructions: dict.auth.instructions,
              countryLabel: dict.auth.countryLabel,
              searchPlaceholder: dict.auth.searchPlaceholder,
              noResults: dict.auth.noResults,
              retry: dict.auth.retry,
              providerError: dict.auth.providerError,
              listboxLabel: dict.auth.listboxLabel,
              composedLabel: dict.auth.composedLabel,
            }}
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
