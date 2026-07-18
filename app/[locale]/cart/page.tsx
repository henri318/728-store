import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { CartView } from '@/modules/cart/presentation/components/cart-view';
import type { CartViewItem } from '@/modules/cart/application/get-cart-view-use-case';

/**
 * Cart page — RSC shell.
 *
 * - Authenticated users: fetches the server cart via GetCart, enriches
 *   items with product display data and customization snapshots, and
 *   passes them to <CartView />.
 * - Unauthenticated users: passes an empty items array; the <CartView />
 *   will be hydrated on the client via the GuestCartContext (which is
 *   provided at the layout level).
 *
 * Spec REQ-CART-031.
 */
export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user?.id;

  let items: CartViewItem[] = [];

  if (isAuthenticated) {
    ({ items } = await container.getCartViewUseCase().execute({
      userId: session.user.id,
      locale,
      unknownProductName: dict.common.unknownProduct,
      unknownSellerName: dict.common.unknownSeller,
    }));
  }

  return (
    <CartView
      items={items}
      locale={locale}
      isAuthenticated={isAuthenticated}
      labels={{
        title: dict.common.cartTitle,
        emptyTitle: dict.common.cartEmptyTitle,
        emptyDescription: dict.common.cartEmptyDescription,
        browseProducts: dict.common.browseProducts,
        soldBy: dict.common.soldBy,
        remove: dict.common.removeFromCart,
        subtotal: dict.common.subtotal,
        checkout: dict.common.checkout,
        unknownProduct: dict.common.unknownProduct,
        unknownSeller: dict.common.unknownSeller,
        customizationSize: dict.common.customizationSize,
        customizationColor: dict.common.customizationColor,
        customizationText: dict.common.customizationText,
        increaseQuantity: dict.common.increaseQuantity,
        decreaseQuantity: dict.common.decreaseQuantity,
        customizationEditFromCart: dict.common.customizationEditFromCart,
        customizationDesignImageAlt: dict.common.customizationDesignImageAlt,
        price: dict.common.price,
      }}
    />
  );
}
