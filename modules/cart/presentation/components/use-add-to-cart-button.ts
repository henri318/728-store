import { useCallback, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { dispatchCartUpdated } from '@/modules/cart/presentation/cart-events';
import { useGuestCart } from '@/modules/cart/presentation/guest-cart-context';
import {
  customizationDraftSchema,
  normalizeCustomizationDraft,
} from './customization-draft-schema';
import {
  hasCustomizationContent,
  isCustomizationMatching,
} from './cart-item-matching';
import type { AddToCartButtonProps, ButtonState } from './add-to-cart-types';
import { useAuthenticatedCart } from './use-authenticated-cart';
import { useAuthenticatedCartActions } from './use-authenticated-cart-actions';
import { useGuestCartActions } from './use-guest-cart-actions';

const MAX_QUANTITY = 99;

export function useAddToCartButton(props: AddToCartButtonProps) {
  const { status } = useSession();
  const guestCart = useGuestCart();
  const isAuthenticated = status === 'authenticated';
  const [state, setState] = useState<ButtonState>('idle');
  const [showCustomizationChoice, setShowCustomizationChoice] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);
  const normalizedCustomization = useMemo(
    () => normalizeCustomizationDraft(props.customization ?? null),
    [props.customization],
  );
  const hasCustomization = hasCustomizationContent(normalizedCustomization);
  const authenticatedCart = useAuthenticatedCart({
    isAuthenticated,
    productId: props.productId,
    editCartItemId: props.editCartItemId,
    customization: normalizedCustomization,
  });
  const guestMatch = isAuthenticated
    ? undefined
    : guestCart.items.find(
        (item) =>
          item.productId === props.productId &&
          isCustomizationMatching(
            {
              text: item.customizationText,
              color: item.customizationColor,
              size: item.customizationSize,
              imageUrl: item.customizationImageUrl,
            },
            normalizedCustomization,
          ),
      );
  const fail = useCallback(() => {
    setState('error');
    setTimeout(() => setState('idle'), 3000);
  }, []);
  const authenticatedActions = useAuthenticatedCartActions({
    productId: props.productId,
    cartItemInfo: authenticatedCart.cartItemInfo,
    setCartItemInfo: authenticatedCart.setCartItemInfo,
    onFailure: fail,
  });
  const guestActions = useGuestCartActions({
    cart: guestCart,
    match: guestMatch,
    props,
  });
  const quantity = isAuthenticated
    ? (authenticatedCart.cartItemInfo?.quantity ?? 0)
    : (guestMatch?.quantity ?? 0);

  const performAdd = useCallback(
    async (draft: typeof normalizedCustomization | null) => {
      setState('adding');
      try {
        const normalized = draft ?? normalizeCustomizationDraft(null);
        if (!customizationDraftSchema.safeParse(normalized).success)
          return fail();
        const added = isAuthenticated
          ? await authenticatedActions.addItem(normalized)
          : (guestActions.addItem(normalized), true);
        if (!added) return fail();
        setState('success');
        setTimeout(() => setState('idle'), 2000);
        dispatchCartUpdated();
        await authenticatedCart.refreshCart();
      } catch {
        fail();
      }
    },
    [
      authenticatedActions,
      authenticatedCart,
      fail,
      guestActions,
      isAuthenticated,
    ],
  );

  const updateQuantity = useCallback(
    async (nextQuantity: number) => {
      if (savingDesign || nextQuantity < 1 || nextQuantity > MAX_QUANTITY)
        return;
      if (isAuthenticated)
        await authenticatedActions.updateQuantity(nextQuantity);
      else guestActions.updateQuantity(nextQuantity);
    },
    [authenticatedActions, guestActions, isAuthenticated, savingDesign],
  );

  const onSaveDesign = useCallback(async () => {
    if (!customizationDraftSchema.safeParse(normalizedCustomization).success)
      return;
    setSavingDesign(true);
    try {
      if (isAuthenticated)
        await authenticatedActions.saveDesign(normalizedCustomization);
      else guestActions.saveDesign(normalizedCustomization);
    } finally {
      setSavingDesign(false);
    }
  }, [
    authenticatedActions,
    guestActions,
    isAuthenticated,
    normalizedCustomization,
  ]);

  const onRemove = useCallback(async () => {
    if (savingDesign) return;
    if (isAuthenticated) await authenticatedActions.removeItem();
    else guestActions.removeItem();
  }, [authenticatedActions, guestActions, isAuthenticated, savingDesign]);

  return {
    state,
    quantity,
    isInCart: quantity > 0,
    productInCart: authenticatedCart.productInCart,
    isAuthenticated,
    hasCustomization,
    showCustomizationChoice,
    savingDesign,
    disabled: props.disabled ?? false,
    labels: props.labels,
    customizationChoiceTitle:
      props.labels.customizationChoiceTitle ??
      `${props.labels.customizeProduct ?? 'Customize'} ${props.productName}`,
    onAdd: async (event: React.MouseEvent) => {
      event.preventDefault();
      if (state === 'adding' || props.disabled) return;
      if (props.customizationAvailable && !hasCustomization) {
        setShowCustomizationChoice(true);
        return;
      }
      await performAdd(normalizedCustomization);
    },
    onAddAnother: async (event: React.MouseEvent) => {
      event.preventDefault();
      if (savingDesign || state === 'adding' || props.disabled) return;
      await performAdd(normalizedCustomization);
    },
    onAddWithoutCustomization: async () => {
      setShowCustomizationChoice(false);
      await performAdd(null);
    },
    onCloseChoice: () => setShowCustomizationChoice(false),
    onIncrement: () => updateQuantity(quantity + 1),
    onDecrement: () => updateQuantity(quantity - 1),
    onRemove,
    onSaveDesign,
  };
}
