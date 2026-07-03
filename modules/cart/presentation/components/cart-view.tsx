'use client';

import { useReducer, useCallback, useEffect } from 'react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { DesignPreview } from '@/modules/presentation/components/design-preview';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
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
    imageUploadId?: string | null;
    colorImageUrl?: string | null;
    designPosition?: {
      imageUrl: string;
      x: number;
      y: number;
      scale: number;
      rotation_deg: number;
      opacity: number;
      blend_mode: string;
    } | null;
  };
}

type LocalItemsAction =
  | { type: 'reset'; items: CartItemDTO[] }
  | { type: 'replace'; items: CartItemDTO[] };

function localItemsReducer(
  _state: CartItemDTO[],
  action: LocalItemsAction,
): CartItemDTO[] {
  return action.items;
}

interface CartViewProps {
  items: CartItemDTO[];
  locale: string;
  isAuthenticated: boolean;
  labels: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    browseProducts: string;
    soldBy: string;
    remove: string;
    subtotal: string;
    checkout: string;
    unknownProduct: string;
    unknownSeller: string;
    customizationSize: string;
    customizationColor: string;
    customizationText: string;
    customizationEditFromCart?: string;
  };
}

function buildCustomizationHref(
  locale: string,
  productId: string,
  customization: CartItemDTO['customization'],
): string | null {
  const hasCustomization =
    customization.text ||
    customization.color ||
    customization.size ||
    customization.imageUrl ||
    customization.imageUploadId ||
    customization.designPosition;

  if (!hasCustomization) {
    return null;
  }

  const params = new URLSearchParams();
  if (customization.text) params.set('customizationText', customization.text);
  if (customization.color)
    params.set('customizationColor', customization.color);
  if (customization.size) params.set('customizationSize', customization.size);
  if (customization.imageUrl)
    params.set('customizationImageUrl', customization.imageUrl);
  if (customization.imageUploadId)
    params.set('customizationImageUploadId', customization.imageUploadId);
  if (customization.designPosition)
    params.set(
      'customizationDesignPosition',
      JSON.stringify(customization.designPosition),
    );

  const query = params.toString();
  return `/${locale}/products/${productId}${query ? `?${query}` : ''}`;
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
  labels,
}: CartViewProps) {
  // Hooks must be called unconditionally (Rules of Hooks).
  const guestCart = useGuestCart();
  const [localItems, dispatchLocalItems] = useReducer(
    localItemsReducer,
    serverItems,
  );

  useEffect(() => {
    if (isAuthenticated) {
      dispatchLocalItems({ type: 'reset', items: serverItems });
    }
  }, [isAuthenticated, serverItems]);

  // Derive display items: server cart for authenticated, guest cart for guests.
  const items: CartItemDTO[] = isAuthenticated
    ? localItems
    : guestCart.items.map((gi) => ({
        id: gi.productId,
        productId: gi.productId,
        productName: gi.productName ?? labels.unknownProduct,
        productImageUrl: gi.productImageUrl ?? null,
        sellerId: gi.sellerId,
        sellerName: gi.sellerName ?? labels.unknownSeller,
        quantity: gi.quantity,
        unitPrice: gi.unitPriceSnapshot,
        lineTotal: +(gi.unitPriceSnapshot * gi.quantity).toFixed(2),
        customization: {
          text: gi.customizationText ?? null,
          color: gi.customizationColor ?? null,
          size: gi.customizationSize ?? null,
          imageUrl: gi.customizationImageUrl ?? null,
          imageUploadId: gi.customizationImageUploadId ?? null,
          colorImageUrl: gi.productImageUrl ?? null,
          designPosition: gi.customizationDesignPosition ?? null,
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
      dispatchLocalItems({
        type: 'replace',
        items: localItems.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: newQty,
                lineTotal: +(i.unitPrice * newQty).toFixed(2),
              }
            : i,
        ),
      });

      try {
        const res = await fetch(`/api/cart/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          dispatchLocalItems({
            type: 'replace',
            items: localItems.map((i) =>
              i.id === item.id
                ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
                : i,
            ),
          });
        }
      } catch {
        dispatchLocalItems({
          type: 'replace',
          items: localItems.map((i) =>
            i.id === item.id
              ? { ...i, quantity: item.quantity, lineTotal: item.lineTotal }
              : i,
          ),
        });
      }
    },
    [isAuthenticated, guestCart, localItems],
  );

  const handleRemove = useCallback(
    async (item: CartItemDTO) => {
      // Guest: remove via context
      if (!isAuthenticated) {
        guestCart.removeItem(item.productId);
        return;
      }

      // Authenticated: optimistic removal + API call
      dispatchLocalItems({
        type: 'replace',
        items: localItems.filter((i) => i.id !== item.id),
      });

      try {
        await fetch(`/api/cart/items/${item.id}`, {
          method: 'DELETE',
        });
      } catch {
        // Network error — item already removed from UI.
      }
    },
    [isAuthenticated, guestCart, localItems],
  );

  // For guest users, wait until localStorage has been hydrated before
  // rendering the empty state. Otherwise we'd flash "empty" on every load.
  if (!isAuthenticated && !guestCart.hydrated) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>{labels.emptyTitle}</h2>
        <p>{labels.emptyDescription}</p>
        <a href={`/${locale}/products`} className={styles.ctaButton}>
          {labels.browseProducts}
        </a>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{labels.title}</h2>

      <div className={styles.items}>
        {items.map((item) => {
          const previewUrl =
            item.customization.colorImageUrl ?? item.productImageUrl;
          const designPos = item.customization.designPosition;
          const showCombined =
            item.customization.imageUrl && designPos && previewUrl;

          return (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemPreview}>
                {showCombined ? (
                  <DesignPreview
                    productImageUrl={previewUrl!}
                    designImageUrl={item.customization.imageUrl!}
                    designPosition={designPos!}
                    width={100}
                    height={100}
                    borderRadius={6}
                  />
                ) : previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={item.productName}
                    className={styles.previewImage}
                  />
                ) : null}
                {!showCombined && item.customization.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.customization.imageUrl}
                    alt="Dise\u00f1o subido"
                    className={styles.designThumb}
                  />
                )}
              </div>

              <div className={styles.itemInfo}>
                <span className={styles.productName}>{item.productName}</span>
                <span className={styles.sellerName}>
                  {labels.soldBy} {item.sellerName}
                </span>

                {item.customization.size && (
                  <span className={styles.customizationLine}>
                    {labels.customizationSize}: {item.customization.size}
                  </span>
                )}

                {item.customization.color && (
                  <span className={styles.customizationLine}>
                    Estilo: {item.customization.color}
                  </span>
                )}

                {item.customization.text && (
                  <span className={styles.customizationText}>
                    {item.customization.text}
                  </span>
                )}

                {labels.customizationEditFromCart &&
                  buildCustomizationHref(
                    locale,
                    item.productId,
                    item.customization,
                  ) && (
                    <a
                      href={
                        buildCustomizationHref(
                          locale,
                          item.productId,
                          item.customization,
                        ) ?? '#'
                      }
                      className={styles.editLink}
                    >
                      {labels.customizationEditFromCart}
                    </a>
                  )}
              </div>

              <div className={styles.itemActions}>
                <span className={styles.unitPrice}>
                  <span className={styles.unitPriceLabel}>Precio:</span>{' '}
                  {Money.format(item.unitPrice, Currency.EUR)}
                </span>

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
                  {Money.format(item.lineTotal, Currency.EUR)}
                </span>

                <button
                  aria-label={labels.remove}
                  className={styles.removeButton}
                  onClick={() => handleRemove(item)}
                >
                  <svg
                    className={styles.iconTrash}
                    aria-hidden="true"
                    width="18"
                    height="18"
                  >
                    <use href="/img/icons/sprites.svg#icon-trash" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.summary}>
        <div className={styles.subtotalRow}>
          <span>{labels.subtotal}</span>
          <span>{Money.format(subtotal, Currency.EUR)}</span>
        </div>

        {isAuthenticated && (
          <a href={`/${locale}/checkout`} className={styles.checkoutButton}>
            {labels.checkout}
          </a>
        )}
      </div>
    </div>
  );
}
