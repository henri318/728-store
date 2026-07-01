'use client';

import { useEffect, useState, useRef, useCallback, useReducer } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  useGuestCart,
  type GuestCartItem,
} from '@/modules/cart/presentation/guest-cart-context';
import { useCartPopup } from './cart-popup-context';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { QuantityControls } from '@/shared/ui/quantity-controls';
import styles from './cart-popup.module.css';

const CART_UPDATED_EVENT = 'cart:updated';

function dispatchCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

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

interface CartPopupLabels {
  title: string;
  empty: string;
  browseProducts: string;
  checkout: string;
  viewFullCart: string;
  subtotal: string;
  loading: string;
  soldBy: string;
  remove: string;
  unknownProduct: string;
  unknownSeller: string;
}

interface CartPopupProps {
  labels: CartPopupLabels;
}

function guestItemToDTO(
  item: GuestCartItem,
  fallback: { productName: string; sellerName: string },
): CartItemDTO {
  return {
    id: item.productId,
    productId: item.productId,
    productName: item.productName ?? fallback.productName,
    productImageUrl: item.productImageUrl ?? null,
    sellerId: item.sellerId,
    sellerName: item.sellerName ?? fallback.sellerName,
    quantity: item.quantity,
    unitPrice: item.unitPriceSnapshot,
    lineTotal: +(item.unitPriceSnapshot * item.quantity).toFixed(2),
  };
}

export function CartPopup({ labels }: CartPopupProps) {
  const { isOpen, close } = useCartPopup();
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] ?? 'es';
  const isAuthenticated = status === 'authenticated';
  const guestCart = useGuestCart();

  const [authItems, setAuthItems] = useState<CartItemDTO[]>([]);
  const [loading, setLoading] = useReducer(
    (_state: boolean, next: boolean) => next,
    false,
  );
  const abortRef = useRef<AbortController | null>(null);
  const unknownProduct = labels.unknownProduct;
  const unknownSeller = labels.unknownSeller;

  const refreshAuthCart = useCallback(() => {
    if (!isOpen || !isAuthenticated) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    fetch('/api/cart', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setAuthItems(
            (data.items ?? []).map((i: CartItemDTO) => ({
              ...i,
              lineTotal: +(i.unitPrice * i.quantity).toFixed(2),
            })),
          );
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    refreshAuthCart();
    const handleCartUpdated = () => refreshAuthCart();
    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    return () => {
      abortRef.current?.abort();
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [isOpen, isAuthenticated, refreshAuthCart]);

  const items = isAuthenticated
    ? authItems
    : guestCart.items.map((item) =>
        guestItemToDTO(item, {
          productName: unknownProduct,
          sellerName: unknownSeller,
        }),
      );
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);

  const handleUpdate = useCallback(
    async (item: CartItemDTO, delta: number) => {
      const nq = Math.max(1, Math.min(99, item.quantity + delta));
      if (nq === item.quantity) return;
      if (!isAuthenticated) {
        guestCart.updateQuantity(item.productId, nq);
        return;
      }
      setAuthItems((p) =>
        p.map((i) =>
          i.id === item.id
            ? { ...i, quantity: nq, lineTotal: +(i.unitPrice * nq).toFixed(2) }
            : i,
        ),
      );
      try {
        const r = await fetch(`/api/cart/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: nq }),
        });
        if (!r.ok)
          setAuthItems((p) =>
            p.map((i) =>
              i.id === item.id
                ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
                : i,
            ),
          );
        if (r.ok) dispatchCartUpdated();
      } catch {
        setAuthItems((p) =>
          p.map((i) =>
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
      setAuthItems((p) => p.filter((i) => i.id !== item.id));
      try {
        const r = await fetch(`/api/cart/items/${item.id}`, {
          method: 'DELETE',
        });
        if (r.ok) dispatchCartUpdated();
      } catch {
        /* removed */
      }
    },
    [isAuthenticated, guestCart],
  );

  const go = (path: string) => {
    close();
    router.push(path);
  };

  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect */
  useEffect(() => setMounted(true), []);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect */
  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={close}>
      <aside
        className={styles.sidebar}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={labels.title}
      >
        <div className={styles.header}>
          <h2>{labels.title}</h2>
          <button
            type="button"
            onClick={close}
            className={styles.closeBtn}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {loading ? (
            <p className={styles.status}>{labels.loading}</p>
          ) : items.length === 0 ? (
            <div className={styles.status}>
              <p>{labels.empty}</p>
              <button
                type="button"
                onClick={() => go(`/${locale}/products`)}
                className={styles.cta}
              >
                {labels.browseProducts}
              </button>
            </div>
          ) : (
            <>
              <ul className={styles.items}>
                {items.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <div className={styles.itemInfo}>
                      {item.productImageUrl && (
                        <Image
                          src={item.productImageUrl}
                          alt={item.productName}
                          width={40}
                          height={40}
                          className={styles.thumb}
                        />
                      )}
                      <div>
                        <span className={styles.name}>
                          {item.productName ?? unknownProduct}
                        </span>
                        <span className={styles.seller}>
                          {labels.soldBy} {item.sellerName ?? unknownSeller}
                        </span>
                      </div>
                    </div>
                    <div className={styles.itemCtrls}>
                      <QuantityControls
                        value={item.quantity}
                        onChange={(newQty) =>
                          handleUpdate(item, newQty - item.quantity)
                        }
                        variant="compact"
                      />
                      <span className={styles.lineTotal}>
                        {Money.format(item.lineTotal, Currency.EUR)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        className={styles.rmBtn}
                        aria-label={labels.remove}
                      >
                        <svg aria-hidden="true">
                          <use href="/img/icons/sprites.svg#icon-trash" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className={styles.footer}>
                <div className={styles.subtotal}>
                  <span>{labels.subtotal}</span>
                  <span>{Money.format(subtotal, Currency.EUR)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => go(`/${locale}/checkout`)}
                  className={styles.checkoutBtn}
                >
                  {labels.checkout}
                </button>
                <button
                  type="button"
                  onClick={() => go(`/${locale}/cart`)}
                  className={styles.fullCartBtn}
                >
                  {labels.viewFullCart}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
