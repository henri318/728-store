'use client';

import { AddToCartButtonView } from './add-to-cart-button-view';
import type { AddToCartButtonProps } from './add-to-cart-types';
import { useAddToCartButton } from './use-add-to-cart-button';

export type { CartButtonLabels } from './add-to-cart-types';

export function AddToCartButton(props: AddToCartButtonProps) {
  const button = useAddToCartButton(props);
  if (!button.canUseCart) return null;

  return (
    <AddToCartButtonView {...button} customizeHref={props.customizeHref} />
  );
}
