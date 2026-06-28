import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { GetCart } from '@/modules/cart/application/get-cart';
import { redirect } from 'next/navigation';
import { CheckoutConfirmButton } from './checkout-confirm-button';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { CustomizationSnapshot } from '@/modules/cart/domain/customization-lookup-port';
import styles from './page.module.css';

interface CheckoutItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customizationIdList: string[];
  customizations: Array<{
    id: string;
    text: string | null;
    color: string | null;
    size: string | null;
    imageUrl: string | null;
  }>;
}

interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CheckoutItem[];
  subtotal: number;
}

/**
 * Checkout page — redesigned for the cart module.
 *
 * - Drops `?productId=` — uses GetCart to load the full cart.
 * - If cart is empty → redirect to /{locale}/cart.
 * - Groups items by sellerId (one section per seller).
 * - Shows subtotal / discount (10% first-purchase) / shipping (€3.99) / total.
 * - Resolves customizationIdList → displays customization details.
 * - Handles missing customizations gracefully (shows "Customization removed").
 * - Client <CheckoutConfirmButton /> handles the checkout flow.
 *
 * Spec REQ-CART-032.
 */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/checkout`);
  }

  const cartRepository = container.getCartRepository();
  const customizationLookup = container.getCustomizationLookup();
  const getCart = new GetCart(cartRepository);
  const cart = await getCart.execute(session.user.id);

  if (cart.items.length === 0) {
    redirect(`/${locale}/cart`);
  }

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

  // Resolve all customizations in a single batch.
  const allCustomizationIds = [
    ...new Set(cart.items.flatMap((i) => i.customizationIdList)),
  ];
  const allCustomizations =
    allCustomizationIds.length > 0
      ? await customizationLookup.findByIds(allCustomizationIds)
      : [];
  const customizationMap = new Map(allCustomizations.map((c) => [c.id, c]));

  const items: CheckoutItem[] = cart.items.map((item) => {
    const product = productMap.get(item.productId.value);
    const resolvedCustomizations = item.customizationIdList
      .map((id) => customizationMap.get(id))
      .filter((c): c is CustomizationSnapshot => c != null)
      .map((c) => ({
        id: c.id,
        text: c.text,
        color: c.color,
        size: c.size,
        imageUrl: c.imageUrl,
      }));

    return {
      id: item.id,
      productId: item.productId.value,
      productName: product?.translations?.[0]?.name ?? 'Unknown Product',
      productImageUrl: product?.images?.[0]?.url ?? null,
      sellerId: item.sellerId.value,
      sellerName: product?.sellerName ?? 'Unknown Seller',
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot.amount,
      lineTotal: +(item.unitPriceSnapshot.amount * item.quantity).toFixed(2),
      customizationIdList: item.customizationIdList,
      customizations: resolvedCustomizations,
    };
  });

  // Detect missing customizations (deleted after being added to cart).
  const hasMissingCustomizations = items.some(
    (item) => item.customizationIdList.length > item.customizations.length,
  );

  // Group by sellerId.
  const sellerMap = new Map<string, SellerGroup>();
  for (const item of items) {
    let group = sellerMap.get(item.sellerId);
    if (!group) {
      group = {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        items: [],
        subtotal: 0,
      };
      sellerMap.set(item.sellerId, group);
    }
    group.items.push(item);
    group.subtotal = +(group.subtotal + item.lineTotal).toFixed(2);
  }
  const sellerGroups = Array.from(sellerMap.values());

  // Totals.
  const subtotal = +items.reduce((acc, i) => acc + i.lineTotal, 0).toFixed(2);

  // Determine first-purchase discount.
  const paidOrderCountPort = container.getPaidOrderCountPort();
  const paidCount = await paidOrderCountPort.countPaidOrdersByUserId(
    session.user.id,
  );
  const isFirstPurchase = paidCount === 0;
  const discount = isFirstPurchase ? +(subtotal * 0.1).toFixed(2) : 0;
  const shipping = 3.99;
  const total = +(subtotal - discount + shipping).toFixed(2);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Checkout</h2>

      {hasMissingCustomizations && (
        <div className={styles.warning} role="alert">
          Some customizations are no longer available and will not be included
          in your order.
        </div>
      )}

      {sellerGroups.map((group) => (
        <div key={group.sellerId} className={styles.sellerSection}>
          <h3 className={styles.sellerName}>{group.sellerName}</h3>
          {group.items.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.productName}</span>
                {item.customizations.length > 0 && (
                  <span className={styles.itemCustomization}>
                    {[
                      ...item.customizations.flatMap((c) => [
                        c.size && `Size: ${c.size}`,
                        c.color && `Color: ${c.color}`,
                        c.text && `Text: ${c.text}`,
                      ]),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
                {item.customizationIdList.length >
                  item.customizations.length && (
                  <span className={styles.itemCustomizationRemoved}>
                    Customization removed
                  </span>
                )}
              </div>
              <div className={styles.itemRight}>
                <span className={styles.itemQty}>×{item.quantity}</span>
                <span className={styles.itemLineTotal}>
                  {Money.format(item.lineTotal, Currency.EUR)}
                </span>
              </div>
            </div>
          ))}
          <div className={styles.sellerSubtotal}>
            <span>Subtotal</span>
            <span>{Money.format(group.subtotal, Currency.EUR)}</span>
          </div>
        </div>
      ))}

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>{Money.format(subtotal, Currency.EUR)}</span>
        </div>
        {isFirstPurchase && (
          <div className={styles.totalRow}>
            <span>10% first-purchase discount</span>
            <span className={styles.discount}>
              −{Money.format(discount, Currency.EUR)}
            </span>
          </div>
        )}
        <div className={styles.totalRow}>
          <span>Shipping</span>
          <span>{Money.format(shipping, Currency.EUR)}</span>
        </div>
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Total</span>
          <span>{Money.format(total, Currency.EUR)}</span>
        </div>
      </div>

      <CheckoutConfirmButton locale={locale} />
    </div>
  );
}
