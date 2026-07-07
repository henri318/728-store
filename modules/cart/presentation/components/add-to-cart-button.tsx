'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import { dispatchCartUpdated } from '@/modules/cart/presentation/cart-events';
import { AddToCartChoiceModal } from './add-to-cart-choice-modal';
import {
  customizationDraftSchema,
  normalizeCustomizationDraft,
  type CustomizationDraftPayload,
} from './customization-draft-schema';
import styles from './add-to-cart-button.module.css';

const hasText = (value?: string | null) => value != null && value.length > 0;

export interface CartButtonLabels {
  addToCart: string;
  removeFromCart: string;
  adding: string;
  added: string;
  error: string;
  customizeProduct?: string;
  addWithoutCustomization?: string;
  customizationChoiceBadge?: string;
  customizationChoiceTitle?: string;
  customizationChoiceMessage?: string;
  decreaseQuantity?: string;
  increaseQuantity?: string;
  saveDesign?: string;
  savingDesign?: string;
  alreadyInCart?: string;
  alreadyInCartDifferent?: string;
}

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  imageUrl?: string | null;
  customization?: CustomizationDraftPayload | null;
  customizationAvailable?: boolean;
  customizeHref?: string;
  disabled?: boolean;
  labels: CartButtonLabels;
}

interface CartItemInfo {
  cartItemId: string;
  quantity: number;
}

type ButtonState = 'idle' | 'adding' | 'success' | 'error';
const MAX_QUANTITY = 99;

function isGuestCustomizationMatching(
  item: {
    customizationText?: string | null;
    customizationColor?: string | null;
    customizationSize?: string | null;
    customizationImageUrl?: string | null;
  },
  draft: CustomizationDraftPayload | null,
): boolean {
  const norm = normalizeCustomizationDraft(draft);
  return (
    (item.customizationText ?? null) === (norm.text ?? null) &&
    (item.customizationColor ?? null) === (norm.color ?? null) &&
    (item.customizationSize ?? null) === (norm.size ?? null) &&
    (item.customizationImageUrl ?? null) === (norm.imageUrl ?? null)
  );
}

function isAuthCustomizationMatching(
  customizations: Array<{
    text?: string | null;
    color?: string | null;
    size?: string | null;
    imageUrl?: string | null;
  }>,
  draft: CustomizationDraftPayload | null,
): boolean {
  const norm = normalizeCustomizationDraft(draft);
  const hasDraftContent =
    hasText(norm.text) ||
    hasText(norm.color) ||
    hasText(norm.size) ||
    hasText(norm.imageUrl) ||
    Boolean(norm.designPosition);

  if (!hasDraftContent) {
    return customizations.length === 0;
  }

  return customizations.some(
    (c) =>
      (c.text ?? null) === (norm.text ?? null) &&
      (c.color ?? null) === (norm.color ?? null) &&
      (c.size ?? null) === (norm.size ?? null) &&
      (c.imageUrl ?? null) === (norm.imageUrl ?? null),
  );
}

/**
 * Cart button with quantity controls.
 *
 * - Not in cart → "Add to Cart" button.
 * - In cart → [- qty +] + "Remove" button.
 *
 * Guest: GuestCartContext. Auth: API calls.
 */
export function AddToCartButton({
  productId,
  productName,
  sellerId,
  sellerName,
  price,
  imageUrl = null,
  customization = null,
  customizationAvailable = false,
  customizeHref,
  disabled = false,
  labels,
}: AddToCartButtonProps) {
  const { status } = useSession();
  const {
    items,
    addItem,
    updateItemQuantity,
    removeItemById,
    updateItemCustomization,
  } = useGuestCart();
  const isAuthenticated = status === 'authenticated';

  const [state, setState] = useState<ButtonState>('idle');
  const [cartItemInfo, setCartItemInfo] = useState<CartItemInfo | null>(null);
  const [hasDifferentCustomization, setHasDifferentCustomization] =
    useState(false);
  const [showCustomizationChoice, setShowCustomizationChoice] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);

  const normalizedCustomization = useMemo(
    () => normalizeCustomizationDraft(customization),
    [customization],
  );
  const isCustomizationHasContent =
    hasText(normalizedCustomization.text) ||
    hasText(normalizedCustomization.color) ||
    hasText(normalizedCustomization.size) ||
    hasText(normalizedCustomization.imageUrl) ||
    Boolean(normalizedCustomization.designPosition);

  // Fetch cart for authenticated users.
  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;

    async function fetchCart() {
      try {
        const res = await fetch('/api/cart');
        if (isCancelled || !res.ok) return;
        const data = await res.json();
        if (isCancelled) return;
        const items = data.items ?? [];
        const anyInCart = items.find(
          (item: { productId: string }) => item.productId === productId,
        );
        const found = items.find(
          (item: {
            productId: string;
            customizations?: Array<{
              text?: string | null;
              color?: string | null;
              size?: string | null;
              imageUrl?: string | null;
            }>;
          }) =>
            item.productId === productId &&
            isAuthCustomizationMatching(
              item.customizations ?? [],
              normalizedCustomization,
            ),
        );
        setCartItemInfo(
          found ? { cartItemId: found.id, quantity: found.quantity } : null,
        );
        setHasDifferentCustomization(!!anyInCart && !found);
      } catch {
        /* fallback to "Add to Cart" */
      }
    }

    fetchCart();
    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, productId, normalizedCustomization]);

  // Determine current quantity (match by productId + customization).
  const guestMatch = isAuthenticated
    ? undefined
    : items.find(
        (i) =>
          i.productId === productId &&
          isGuestCustomizationMatching(i, normalizedCustomization),
      );
  const guestDiffMatch =
    !isAuthenticated && !guestMatch
      ? items.find((i) => i.productId === productId)
      : undefined;
  const currentQuantity = isAuthenticated
    ? (cartItemInfo?.quantity ?? 0)
    : (guestMatch?.quantity ?? 0);

  const isInCart = currentQuantity > 0;
  const alreadyInCartDifferent = isAuthenticated
    ? hasDifferentCustomization
    : !!guestDiffMatch;

  const customizeProductLabel = labels.customizeProduct ?? 'Customize';
  const addWithoutCustomizationLabel =
    labels.addWithoutCustomization ?? 'Add without customization';
  const customizationChoiceBadgeLabel =
    labels.customizationChoiceBadge ?? 'Customizable product';
  const customizationChoiceTitle =
    labels.customizationChoiceTitle ??
    `${customizeProductLabel} ${productName}`;
  const customizationChoiceMessage =
    labels.customizationChoiceMessage ??
    'You can customize this product first or add it as-is.';
  const decreaseQuantityLabel = labels.decreaseQuantity ?? 'Decrease quantity';
  const increaseQuantityLabel = labels.increaseQuantity ?? 'Increase quantity';

  // Refresh cart after add (authenticated).
  const refreshCartForProduct = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) return;
      const data = await res.json();
      const items = data.items ?? [];
      const anyInCart = items.find(
        (item: { productId: string }) => item.productId === productId,
      );
      const found = items.find(
        (item: {
          productId: string;
          customizations?: Array<{
            text?: string | null;
            color?: string | null;
            size?: string | null;
            imageUrl?: string | null;
          }>;
        }) =>
          item.productId === productId &&
          isAuthCustomizationMatching(
            item.customizations ?? [],
            normalizedCustomization,
          ),
      );
      setCartItemInfo(
        found ? { cartItemId: found.id, quantity: found.quantity } : null,
      );
      setHasDifferentCustomization(!!anyInCart && !found);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, productId, normalizedCustomization]);

  const handleSaveDesign = useCallback(async () => {
    const draft = normalizeCustomizationDraft(customization);
    const validation = customizationDraftSchema.safeParse(draft);
    if (!validation.success) return;

    setSavingDesign(true);

    try {
      if (isAuthenticated) {
        const customizationResponse = await fetch(
          '/api/customizations/customer',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              text: draft.text,
              color: draft.color,
              size: draft.size,
              imageUrl: draft.imageUrl,
              designPosition: draft.designPosition ?? null,
            }),
          },
        );

        if (!customizationResponse.ok) {
          setSavingDesign(false);
          return;
        }

        const customizationData = (await customizationResponse.json()) as {
          id?: string;
        };
        const newId = customizationData.id;

        if (newId && cartItemInfo) {
          await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quantity: cartItemInfo.quantity,
              customizationIdList: [newId],
            }),
          });
          dispatchCartUpdated();
        }
      } else if (guestMatch?.id) {
        updateItemCustomization(guestMatch.id, {
          text: draft.text,
          color: draft.color,
          size: draft.size,
          imageUrl: draft.imageUrl,
          imageUploadId: draft.imageUploadId,
          designPosition: draft.designPosition ?? null,
        });
      }
    } catch {
      /* ignore */
    } finally {
      setSavingDesign(false);
    }
  }, [
    isAuthenticated,
    customization,
    productId,
    cartItemInfo,
    guestMatch,
    updateItemCustomization,
  ]);

  const performAuthenticatedAdd = useCallback(
    async (draft: CustomizationDraftPayload | null) => {
      const validation = customizationDraftSchema.safeParse(
        draft ?? normalizeCustomizationDraft(null),
      );
      if (!validation.success) return false;

      let customizationIdList: string[] = [];
      const hasCustomizationContent =
        draft &&
        (hasText(draft.text) ||
          hasText(draft.color) ||
          hasText(draft.size) ||
          hasText(draft.imageUrl) ||
          Boolean(draft.designPosition));

      if (hasCustomizationContent) {
        const customizationResponse = await fetch(
          '/api/customizations/customer',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              text: draft.text,
              color: draft.color,
              size: draft.size,
              imageUrl: draft.imageUrl,
              designPosition: draft.designPosition ?? null,
            }),
          },
        );
        if (!customizationResponse.ok) return false;

        const customizationData = (await customizationResponse.json()) as {
          id?: string;
        };
        if (customizationData.id) {
          customizationIdList = [customizationData.id];
        }
      }

      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1, customizationIdList }),
      });

      return res.ok;
    },
    [productId],
  );

  const performAdd = useCallback(
    async (draft: CustomizationDraftPayload | null) => {
      setState('adding');

      let isOk = false;
      try {
        if (isAuthenticated) {
          isOk = await performAuthenticatedAdd(draft);
        } else {
          const normalized = draft ?? normalizeCustomizationDraft(null);
          const validation = customizationDraftSchema.safeParse(normalized);
          if (validation.success) {
            addItem({
              productId,
              sellerId,
              quantity: 1,
              unitPriceSnapshot: price,
              productName,
              sellerName,
              productImageUrl: imageUrl,
              customizationText: normalized.text,
              customizationColor: normalized.color,
              customizationSize: normalized.size,
              customizationImageUrl: normalized.imageUrl,
              customizationImageUploadId: normalized.imageUploadId,
              customizationDesignPosition: normalized.designPosition ?? null,
            });
            isOk = true;
          }
        }

        if (!isOk) {
          setState('error');
          setTimeout(() => setState('idle'), 3000);
          return;
        }

        setState('success');
        setTimeout(() => setState('idle'), 2000);
        dispatchCartUpdated();
        refreshCartForProduct();
      } catch {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    },
    [
      isAuthenticated,
      productId,
      sellerId,
      price,
      productName,
      sellerName,
      imageUrl,
      addItem,
      refreshCartForProduct,
      performAuthenticatedAdd,
    ],
  );

  const handleAdd = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (state === 'adding' || disabled) return;

      if (customizationAvailable && !isCustomizationHasContent) {
        setShowCustomizationChoice(true);
        return;
      }

      await performAdd(normalizedCustomization);
    },
    [
      state,
      disabled,
      customizationAvailable,
      isCustomizationHasContent,
      normalizedCustomization,
      performAdd,
    ],
  );

  const handleAddWithoutCustomization = useCallback(async () => {
    setShowCustomizationChoice(false);
    await performAdd(null);
  }, [performAdd]);

  const handleIncrement = useCallback(async () => {
    if (!isInCart || currentQuantity >= MAX_QUANTITY) return;
    const newQty = currentQuantity + 1;
    if (isAuthenticated && cartItemInfo) {
      const prevCartItemInfo = cartItemInfo;
      setCartItemInfo({ ...cartItemInfo, quantity: newQty });
      try {
        const res = await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          setCartItemInfo(prevCartItemInfo);
          return;
        }
        dispatchCartUpdated();
      } catch {
        setCartItemInfo(prevCartItemInfo);
      }
    } else if (guestMatch?.id) {
      updateItemQuantity(guestMatch.id, newQty);
    }
  }, [
    isInCart,
    currentQuantity,
    isAuthenticated,
    cartItemInfo,
    guestMatch,
    updateItemQuantity,
  ]);

  const handleDecrement = useCallback(async () => {
    if (!isInCart) return;
    if (currentQuantity <= 1) return; // use explicit remove button

    const newQty = currentQuantity - 1;
    if (isAuthenticated && cartItemInfo) {
      const prevCartItemInfo = cartItemInfo;
      setCartItemInfo({ ...cartItemInfo, quantity: newQty });
      try {
        const res = await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          setCartItemInfo(prevCartItemInfo);
          return;
        }
        dispatchCartUpdated();
      } catch {
        setCartItemInfo(prevCartItemInfo);
      }
    } else if (guestMatch?.id) {
      updateItemQuantity(guestMatch.id, newQty);
    }
  }, [
    isInCart,
    currentQuantity,
    isAuthenticated,
    cartItemInfo,
    guestMatch,
    updateItemQuantity,
  ]);

  const handleRemove = useCallback(async () => {
    if (isAuthenticated && cartItemInfo) {
      const prev = cartItemInfo;
      setCartItemInfo(null);
      try {
        const res = await fetch(`/api/cart/items/${cartItemInfo.cartItemId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          setCartItemInfo(prev);
          return;
        }
        dispatchCartUpdated();
      } catch {
        setCartItemInfo(prev);
      }
    } else if (guestMatch?.id) {
      removeItemById(guestMatch.id);
    }
  }, [isAuthenticated, cartItemInfo, guestMatch, removeItemById]);

  const feedbackLabel = (() => {
    if (state === 'adding') return labels.adding;
    if (state === 'success') return labels.added;
    if (state === 'error') return labels.error;
    return labels.addToCart;
  })();

  // Success / Error feedback.
  if (state === 'success' || state === 'error') {
    return (
      <button
        type="button"
        className={`${styles.button} ${state === 'success' ? styles.success : styles.error}`}
        disabled
        aria-label={feedbackLabel}
      >
        {feedbackLabel}
      </button>
    );
  }

  // In cart: quantity controls + save design + remove button.
  if (isInCart) {
    return (
      <div className={styles.quantityRow}>
        <div className={styles.quantityControls}>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={handleDecrement}
            disabled={currentQuantity <= 1}
            aria-label={decreaseQuantityLabel}
          >
            −
          </button>
          <span className={styles.quantityDisplay} aria-live="polite">
            {currentQuantity}
          </span>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={handleIncrement}
            disabled={currentQuantity >= MAX_QUANTITY}
            aria-label={increaseQuantityLabel}
          >
            +
          </button>
        </div>
        {isCustomizationHasContent && labels.saveDesign && (
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveDesign}
            disabled={savingDesign}
          >
            {savingDesign
              ? (labels.savingDesign ?? labels.saveDesign)
              : labels.saveDesign}
          </button>
        )}
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleRemove}
          aria-label={labels.removeFromCart}
        >
          <svg aria-hidden="true" width="36" height="36">
            <use href="/img/icons/sprites.svg#icon-trash" />
          </svg>
        </button>
      </div>
    );
  }

  // Default: "Add to Cart" (with optional "already in cart" label).
  return (
    <>
      <AddToCartChoiceModal
        open={showCustomizationChoice}
        badgeLabel={customizationChoiceBadgeLabel}
        title={customizationChoiceTitle}
        message={customizationChoiceMessage}
        customizeLabel={customizeProductLabel}
        addWithoutCustomizationLabel={addWithoutCustomizationLabel}
        customizeHref={customizeHref}
        onAddWithoutCustomization={handleAddWithoutCustomization}
        onClose={() => setShowCustomizationChoice(false)}
      />
      <div className={styles.addRow}>
        <button
          type="button"
          className={`${styles.iconButton} ${state === 'adding' ? styles.loading : ''}`}
          onClick={handleAdd}
          disabled={disabled || state === 'adding'}
          aria-label={feedbackLabel}
        >
          <svg aria-hidden="true" width="40" height="40">
            <use href="/img/icons/sprites.svg#icon-add" />
          </svg>
        </button>
        {alreadyInCartDifferent && labels.alreadyInCartDifferent && (
          <span className={styles.alreadyInCartLabel}>
            {labels.alreadyInCartDifferent}
          </span>
        )}
      </div>
    </>
  );
}
