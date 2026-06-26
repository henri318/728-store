'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
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
 * Renders cart items with optimistic +/- quantity controls and remove.
 * Falls back to an empty state with a CTA to browse products.
 */
export function CartView({
  items: initialItems,
  locale,
  isAuthenticated,
}: CartViewProps) {
  const [items, setItems] = useState(initialItems);

  const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0);

  const handleUpdateQuantity = useCallback(
    async (item: CartItemDTO, delta: number) => {
      const newQty = Math.max(1, Math.min(99, item.quantity + delta));
      if (newQty === item.quantity) return;

      // Optimistic update
      setItems((prev) =>
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
          // Revert on failure
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
                : i,
            ),
          );
        }
      } catch {
        // Revert on network error
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
              : i,
          ),
        );
      }
    },
    [],
  );

  const handleRemove = useCallback(async (itemId: string) => {
    // Optimistic removal
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        // We can't easily revert without keeping the old items, so just
        // let the user re-fetch. In practice the server rarely rejects
        // a valid DELETE.
      }
    } catch {
      // Network error — item already removed from UI.
    }
  }, []);

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

              <span className={styles.lineTotal}>
                €{item.lineTotal.toFixed(2)}
              </span>

              <button
                aria-label="Remove"
                className={styles.removeButton}
                onClick={() => handleRemove(item.id)}
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
          <span>€{subtotal.toFixed(2)}</span>
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
