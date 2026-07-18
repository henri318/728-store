'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useReducer,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { useCartPopup } from './cart-popup-context';
import {
  DesignPreview,
  type DesignPositionData,
} from '@/modules/presentation/components/design-preview';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { QuantityControls } from '@/shared/ui/quantity-controls';
import {
  CART_UPDATED_EVENT,
  dispatchCartUpdated,
} from '@/modules/cart/presentation/cart-events';
import {
  guestItemToDTO,
  type CartItemDTO,
} from '@/modules/cart/presentation/cart-dto';
import styles from './cart-popup.module.css';

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
  increaseQuantity: string;
  decreaseQuantity: string;
  close: string;
}

interface CartPopupProps {
  labels: CartPopupLabels;
}

export function CartPopup({ labels }: CartPopupProps) {
  const { isOpen, close } = useCartPopup();
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/', 2)[1] ?? 'es';
  const isAuthenticated = status === 'authenticated';
  const isInternal =
    session?.user?.role === 'ADMIN' || session?.user?.role === 'DESIGNER';
  const canUseCart = isAuthenticated && !isInternal;
  const userId = session?.user?.id;
  const guestCart = useGuestCart();

  const [authItems, setAuthItems] = useState<CartItemDTO[]>([]);
  const [authItemsOwnerId, setAuthItemsOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useReducer(
    (_isLoading: boolean, shouldLoad: boolean) => shouldLoad,
    false,
  );
  const unknownProduct = labels.unknownProduct;
  const unknownSeller = labels.unknownSeller;
  const requestSequenceRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen || !canUseCart || !userId) return;
    const doFetch = async () => {
      requestControllerRef.current?.abort();
      const ctrl = new AbortController();
      requestControllerRef.current = ctrl;
      const requestSequence = ++requestSequenceRef.current;
      setLoading(true);
      try {
        const res = await fetch('/api/cart', { signal: ctrl.signal });
        if (
          ctrl.signal.aborted ||
          requestSequence !== requestSequenceRef.current
        )
          return;
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (
          ctrl.signal.aborted ||
          requestSequence !== requestSequenceRef.current
        )
          return;
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
                    designPosition:
                      (firstC.designPosition as Record<string, unknown>) ??
                      null,
                  }
                : null,
            } as CartItemDTO;
          }),
        );
        setAuthItemsOwnerId(userId);
      } catch {
        // The next request owns the loading state after an abort.
      } finally {
        if (requestSequence === requestSequenceRef.current) setLoading(false);
      }
    };
    doFetch();
    const handleCartUpdated = () => doFetch();
    globalThis.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    return () => {
      requestSequenceRef.current += 1;
      requestControllerRef.current?.abort();
      globalThis.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [isOpen, canUseCart, userId]);

  const items =
    canUseCart && authItemsOwnerId === userId
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
      if (!canUseCart) {
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
    [canUseCart, guestCart],
  );

  const handleRemove = useCallback(
    async (item: CartItemDTO) => {
      if (!canUseCart) {
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
    [canUseCart, guestCart],
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

  function renderThumbnail(item: CartItemDTO) {
    if (
      item.customization?.imageUrl != null &&
      item.customization?.designPosition != null
    ) {
      return (
        <DesignPreview
          productImageUrl={item.productImageUrl ?? ''}
          designImageUrl={item.customization.imageUrl}
          designPosition={
            item.customization.designPosition as unknown as DesignPositionData
          }
          width={40}
          height={40}
          borderRadius={4}
        />
      );
    }
    if (item.productImageUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.productImageUrl}
          alt={item.productName}
          className={styles.thumb}
        />
      );
    }
    return null;
  }

  let content: ReactNode;
  if (canUseCart && loading) {
    content = <p className={styles.status}>{labels.loading}</p>;
  } else if (items.length === 0) {
    content = (
      <div className={styles.status}>
        <p>{labels.empty}</p>
        <button
          type="button"
          onClick={() => go(`/${locale}/`)}
          className={styles.cta}
        >
          {labels.browseProducts}
        </button>
      </div>
    );
  } else {
    content = (
      <>
        <ul className={styles.items}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <div className={styles.itemInfo}>
                {renderThumbnail(item)}
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
                <QuantityControls
                  value={item.quantity}
                  onChange={(newQty) =>
                    handleUpdate(item, newQty - item.quantity)
                  }
                  variant="compact"
                  decrementLabel={labels.decreaseQuantity}
                  incrementLabel={labels.increaseQuantity}
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
    );
  }

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
            aria-label={labels.close}
          >
            ✕
          </button>
        </div>
        <div className={styles.content}>{content}</div>
      </aside>
    </div>,
    document.body,
  );
}
