'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import styles from './cart-view.module.css';

// --- Types ---

export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customization: {
    text: string | null;
    color: string | null;
    size: string | null;
    imageUrl: string | null;
  };
}

interface CartViewProps {
  items: CartItemDTO[];
  locale: string;
  isAuthenticated: boolean;
}

/**
 * Client component for the cart page.
 *
 * - Authenticated users: renders server-provided items with API-backed
 *   optimistic +/- quantity controls and remove.
 * - Guest users: reads from GuestCartContext (localStorage) and uses
 *   context methods for quantity/remove operations.
 *
 * Falls back to an empty state with a CTA to browse products.
 */
export function CartView({
  items: serverItems,
  locale,
  isAuthenticated,
}: CartViewProps) {
  // Hooks must be called unconditionally (Rules of Hooks).
  const guestCart = useGuestCart();
  const [localItems, setLocalItems] = useState(serverItems);

  // Derive display items: server cart for authenticated, guest cart for guests.
  const items: CartItemDTO[] = isAuthenticated
    ? localItems
    : guestCart.items.map((gi) => ({
        id: gi.productId,
        productId: gi.productId,
        productName: gi.productName ?? 'Unknown Product',
        productImageUrl: gi.productImageUrl ?? null,
        sellerId: gi.sellerId,
        sellerName: gi.sellerName ?? 'Unknown Seller',
        quantity: gi.quantity,
        unitPrice: gi.unitPriceSnapshot,
        lineTotal: +(gi.unitPriceSnapshot * gi.quantity).toFixed(2),
        customization: {
          text: gi.customizationText ?? null,
          color: gi.customizationColor ?? null,
          size: gi.customizationSize ?? null,
          imageUrl: gi.customizationImageUrl ?? null,
        },
      }));

  const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0);

  const handleUpdateQuantity = useCallback(
    async (item: CartItemDTO, delta: number) => {
      const newQty = Math.max(1, Math.min(99, item.quantity + delta));
      if (newQty === item.quantity) return;

      // Guest: update via context (localStorage)
      if (!isAuthenticated) {
        guestCart.updateQuantity(item.productId, newQty);
        return;
      }

      // Authenticated: optimistic update + API call
      setLocalItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: newQty,
                lineTotal: +(i.unitPrice * newQty).toFixed(2),
              }
            : i,
        ),
      );

      try {
        const res = await fetch(`/api/cart/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          setLocalItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
                : i,
            ),
          );
        }
      } catch {
        setLocalItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
              : i,
          ),
        );
      }
    },
    [isAuthenticated, guestCart],
  );

  const handleRemove = useCallback(
    async (item: CartItemDTO) => {
      // Guest: remove via context
      if (!isAuthenticated) {
        guestCart.removeItem(item.productId);
        return;
      }

      // Authenticated: optimistic removal + API call
      setLocalItems((prev) => prev.filter((i) => i.id !== item.id));

      try {
        await fetch(`/api/cart/items/${item.id}`, {
          method: 'DELETE',
        });
      } catch {
        // Network error — item already removed from UI.
      }
    },
    [isAuthenticated, guestCart],
  );

  // For guest users, wait until localStorage has been hydrated before
  // rendering the empty state. Otherwise we'd flash "empty" on every load.
  if (!isAuthenticated && !guestCart.hydrated) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>Your cart is empty</h2>
        <p>Browse our products and add something you love!</p>
        <a href={`/${locale}/products`} className={styles.ctaButton}>
          Browse Products
        </a>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Your Cart</h2>

      <div className={styles.items}>
        {items.map((item) => (
          <div key={item.id} className={styles.itemRow}>
            <div className={styles.itemInfo}>
              {item.productImageUrl && (
                <Image
                  src={item.productImageUrl}
                  alt={item.productName}
                  width={64}
                  height={64}
                  className={styles.thumbnail}
                />
              )}
              <div className={styles.itemDetails}>
                <span className={styles.productName}>{item.productName}</span>
                <span className={styles.sellerName}>
                  Sold by {item.sellerName}
                </span>
                {(item.customization.text ||
                  item.customization.color ||
                  item.customization.size) && (
                  <span className={styles.customization}>
                    {[
                      item.customization.size &&
                        `Size: ${item.customization.size}`,
                      item.customization.color &&
                        `Color: ${item.customization.color}`,
                      item.customization.text &&
                        `Text: ${item.customization.text}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.itemActions}>
              <div className={styles.quantityControls}>
                <button
                  aria-label="−"
                  className={styles.qtyButton}
                  onClick={() => handleUpdateQuantity(item, -1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <span className={styles.quantity}>{item.quantity}</span>
                <button
                  aria-label="+"
                  className={styles.qtyButton}
                  onClick={() => handleUpdateQuantity(item, +1)}
                  disabled={item.quantity >= 99}
                >
                  +
                </button>
              </div>

              <span className={styles.unitPrice}>
                {item.unitPrice.toFixed(2)} €
              </span>

              <span className={styles.lineTotal}>
                {item.lineTotal.toFixed(2)} €
              </span>

              <button
                aria-label="Remove"
                className={styles.removeButton}
                onClick={() => handleRemove(item)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <div className={styles.subtotalRow}>
          <span>Subtotal</span>
          <span>{subtotal.toFixed(2)} €</span>
        </div>

        {isAuthenticated && (
          <a href={`/${locale}/checkout`} className={styles.checkoutButton}>
            Proceed to Checkout
          </a>
        )}
      </div>
    </div>
  );
}
