'use client';

import { useEffect, useState, useRef, useCallback, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  useGuestCart,
  type GuestCartItem,
} from '@/modules/cart/presentation/guest-cart-context';
import { useCartPopup } from './cart-popup-context';
import { DesignPreview, type DesignPositionData } from './design-preview';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
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
  customization?: {
    text: string | null;
    color: string | null;
    size: string | null;
    imageUrl: string | null;
    colorImageUrl?: string | null;
    designPosition?: Record<string, unknown> | null;
  } | null;
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
    id: item.id ?? item.productId,
    productId: item.productId,
    productName: item.productName ?? fallback.productName,
    productImageUrl: item.productImageUrl ?? null,
    sellerId: item.sellerId,
    sellerName: item.sellerName ?? fallback.sellerName,
    quantity: item.quantity,
    unitPrice: item.unitPriceSnapshot,
    lineTotal: +(item.unitPriceSnapshot * item.quantity).toFixed(2),
    customization: {
      text: item.customizationText ?? null,
      color: item.customizationColor ?? null,
      size: item.customizationSize ?? null,
      imageUrl: item.customizationImageUrl ?? null,
      colorImageUrl: item.productImageUrl ?? null,
    },
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
            (data.items ?? []).map((i: Record<string, unknown>) => {
              const customizations =
                (i.customizations as Array<Record<string, unknown>>) ?? [];
              const firstC = customizations[0] ?? null;
              return {
                id: i.id as string,
                productId: i.productId as string,
                productName: i.productName as string,
                productImageUrl:
                  (i.colorImageUrl as string | null) ??
                  (i.productImageUrl as string | null) ??
                  null,
                sellerId: i.sellerId as string,
                sellerName: i.sellerName as string,
                quantity: i.quantity as number,
                unitPrice: i.unitPrice as number,
                lineTotal: +(
                  (i.unitPrice as number) * (i.quantity as number)
                ).toFixed(2),
                customization: firstC
                  ? {
                      text: (firstC.text as string | null) ?? null,
                      color: (firstC.color as string | null) ?? null,
                      size: (firstC.size as string | null) ?? null,
                      imageUrl: (firstC.imageUrl as string | null) ?? null,
                      designPosition: firstC.designPosition
                        ? (firstC.designPosition as Record<string, unknown>)
                        : null,
                    }
                  : null,
              } as CartItemDTO;
            }),
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
        guestCart.updateItemQuantity(item.id, nq);
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
        guestCart.removeItemById(item.id);
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
                      {item.customization?.imageUrl &&
                      item.customization?.designPosition ? (
                        <DesignPreview
                          productImageUrl={item.productImageUrl ?? ''}
                          designImageUrl={item.customization.imageUrl}
                          designPosition={
                            item.customization
                              .designPosition as unknown as DesignPositionData
                          }
                          width={40}
                          height={40}
                          borderRadius={4}
                        />
                      ) : item.productImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.productImageUrl}
                          alt={item.productName}
                          className={styles.thumb}
                        />
                      ) : null}
                      <div className={styles.popupItemDetails}>
                        <span className={styles.name}>
                          {item.productName ?? unknownProduct}
                        </span>
                        <span className={styles.seller}>
                          {labels.soldBy} {item.sellerName ?? unknownSeller}
                        </span>
                        {item.customization?.size && (
                          <span className={styles.popupCustLine}>
                            {item.customization.size}
                          </span>
                        )}
                        {item.customization?.text && (
                          <span className={styles.popupCustText}>
                            {item.customization.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.itemCtrls}>
                      <div className={styles.qty}>
                        <button
                          type="button"
                          onClick={() => handleUpdate(item, -1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdate(item, +1)}
                          disabled={item.quantity >= 99}
                        >
                          +
                        </button>
                      </div>
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
