'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  useGuestCart,
  type GuestCartItem,
} from '@/modules/cart/presentation/guest-cart-context';
import { useCartPopup } from './cart-popup-context';
import styles from './cart-popup.module.css';

interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

function guestItemToDTO(item: GuestCartItem): CartItemDTO {
  return {
    id: item.productId,
    productId: item.productId,
    productName: item.productName ?? 'Unknown Product',
    productImageUrl: item.productImageUrl ?? null,
    sellerId: item.sellerId,
    sellerName: item.sellerName ?? 'Unknown Seller',
    quantity: item.quantity,
    unitPrice: item.unitPriceSnapshot,
    lineTotal: +(item.unitPriceSnapshot * item.quantity).toFixed(2),
  };
}

export function CartPopup() {
  const { isOpen, close } = useCartPopup();
  const { status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === 'authenticated';
  const guestCart = useGuestCart();

  // Authenticated cart items (fetched on open).
  const [authItems, setAuthItems] = useState<CartItemDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch authenticated cart when popup opens.
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // eslint-disable-next-line @eslint-react/set-state-in-effect, react-hooks/set-state-in-effect -- intentional async fetch state management
    setLoading(true);
    fetch('/api/cart', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!controller.signal.aborted) {
          setAuthItems(
            (data.items ?? []).map((item: CartItemDTO) => ({
              ...item,
              lineTotal: +(item.unitPrice * item.quantity).toFixed(2),
            })),
          );
           
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
           
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOpen, isAuthenticated]);

  // Derive items based on auth state.
  const items: CartItemDTO[] = isAuthenticated
    ? authItems
    : guestCart.items.map(guestItemToDTO);

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  // Handlers for quantity updates.
  const handleUpdateQuantity = useCallback(
    async (item: CartItemDTO, delta: number) => {
      const newQty = Math.max(1, Math.min(99, item.quantity + delta));
      if (newQty === item.quantity) return;

      if (!isAuthenticated) {
        guestCart.updateQuantity(item.productId, newQty);
        return;
      }

      // Optimistic update for authenticated.
      setAuthItems((prev) =>
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
          // Rollback.
          setAuthItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
                : i,
            ),
          );
        }
      } catch {
        // Rollback on error.
        setAuthItems((prev) =>
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
      if (!isAuthenticated) {
        guestCart.removeItem(item.productId);
        return;
      }

      // Optimistic removal.
      setAuthItems((prev) => prev.filter((i) => i.id !== item.id));

      try {
        await fetch(`/api/cart/items/${item.id}`, { method: 'DELETE' });
      } catch {
        // Already removed from UI.
      }
    },
    [isAuthenticated, guestCart],
  );

  const handleCheckout = () => {
    close();
    const locale = window.location.pathname.split('/')[1] ?? 'es';
    router.push(`/${locale}/checkout`);
  };

  const handleViewFullCart = () => {
    close();
    const locale = window.location.pathname.split('/')[1] ?? 'es';
    router.push(`/${locale}/cart`);
  };

  // SSR guard.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line @eslint-react/set-state-in-effect, react-hooks/set-state-in-effect -- intentional SSR hydration guard
    setMounted(true);
  }, []);
  if (!mounted) return null;

  if (!isOpen) return null;

  const popup = (
    <div className={styles.overlay} onClick={close}>
      <div
        className={styles.sidebar}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className={styles.header}>
          <h2>Your Cart</h2>
          <button
            type="button"
            onClick={close}
            className={styles.closeButton}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <p>Your cart is empty</p>
              <button
                type="button"
                onClick={() => {
                  close();
                  const locale = window.location.pathname.split('/')[1] ?? 'es';
                  router.push(`/${locale}/products`);
                }}
                className={styles.ctaButton}
              >
                Browse Products
              </button>
            </div>
          ) : (
            <>
              <div className={styles.items}>
                {items.map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <div className={styles.itemInfo}>
                      {item.productImageUrl && (
                        <Image
                          src={item.productImageUrl}
                          alt={item.productName}
                          width={48}
                          height={48}
                          className={styles.thumbnail}
                        />
                      )}
                      <div className={styles.itemDetails}>
                        <span className={styles.productName}>
                          {item.productName}
                        </span>
                        <span className={styles.sellerName}>
                          Sold by {item.sellerName}
                        </span>
                      </div>
                    </div>

                    <div className={styles.itemActions}>
                      <div className={styles.quantityControls}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, -1)}
                          disabled={item.quantity <= 1}
                          className={styles.qtyButton}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className={styles.quantity}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, +1)}
                          disabled={item.quantity >= 99}
                          className={styles.qtyButton}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <span className={styles.lineTotal}>
                        €{item.lineTotal.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        className={styles.removeButton}
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.footer}>
                <div className={styles.subtotalRow}>
                  <span>Subtotal</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className={styles.checkoutButton}
                >
                  Checkout
                </button>

                <button
                  type="button"
                  onClick={handleViewFullCart}
                  className={styles.viewFullCartLink}
                >
                  View full cart
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
