import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { GetCart } from '@/modules/cart/application/get-cart';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import {
  CartView,
  type CartItemDTO,
} from '@/modules/cart/presentation/components/cart-view';
import type { ProductEntity } from '@/modules/products/domain/product-repository';

/**
 * Cart page — RSC shell.
 *
 * - Authenticated users: fetches the server cart via GetCart, enriches
 *   items with product display data, and passes them to <CartView />.
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

  let items: CartItemDTO[] = [];

  if (isAuthenticated) {
    const cartRepository = container.getCartRepository();
    const getCart = new GetCart(cartRepository);
    const cart = await getCart.execute(session.user.id);

    if (cart.items.length > 0) {
      // Enrich items with product display data.
      const productRepository = container.getProductRepository();
      const productIds = [...new Set(cart.items.map((i) => i.productId.value))];
      const products = await Promise.all(
        productIds.map((id) => productRepository.findById(id, locale)),
      );
      const productMap = new Map<string, ProductEntity>();
      products.forEach((p) => {
        if (p) productMap.set(p.id, p);
      });

      items = cart.items.map((item) => {
        const product = productMap.get(item.productId.value);
        return {
          id: item.id,
          productId: item.productId.value,
          productName: product?.translations?.[0]?.name ?? 'Unknown Product',
          productImageUrl: product?.images?.[0]?.url ?? null,
          sellerId: item.sellerId.value,
          sellerName: product?.sellerName ?? 'Unknown Seller',
          quantity: item.quantity,
          unitPrice: item.unitPriceSnapshot.amount,
          lineTotal: +(item.unitPriceSnapshot.amount * item.quantity).toFixed(
            2,
          ),
          customization: {
            text: null,
            color: null,
            size: null,
            imageUrl: null,
          },
        };
      });
    }
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
      }}
    />
  );
}
