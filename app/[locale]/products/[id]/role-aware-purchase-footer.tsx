import Link from 'next/link';
import type { ComponentProps } from 'react';
import type { ProductViewerContext } from '@/shared/authorization/product-viewer-context';
import { AddToCartButton } from '@/modules/cart/presentation/components/add-to-cart-button';

interface RoleAwarePurchaseFooterProps {
  viewerContext: ProductViewerContext;
  editLabel: string;
  cart: ComponentProps<typeof AddToCartButton>;
}

export function RoleAwarePurchaseFooter({
  viewerContext,
  editLabel,
  cart,
}: RoleAwarePurchaseFooterProps) {
  if (viewerContext.canEdit && viewerContext.editHref) {
    return <Link href={viewerContext.editHref}>{editLabel}</Link>;
  }

  return <AddToCartButton {...cart} />;
}
