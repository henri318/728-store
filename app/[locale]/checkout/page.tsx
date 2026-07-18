import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect } from 'next/navigation';
import { CheckoutConfirmButton } from '@/modules/cart/presentation/components/checkout-confirm-button';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { Card } from '@/shared/ui/card';
import Image from 'next/image';
import styles from './page.module.css';

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
  const dict = await getDictionary(locale as 'es' | 'cat');

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/checkout`);
  }

  const checkout = await container.getCheckoutViewUseCase().execute({
    userId: session.user.id,
    locale,
    unknownProductName: dict.common.unknownProduct,
    unknownSellerName: dict.common.unknownSeller,
  });

  if (checkout.items.length === 0) {
    redirect(`/${locale}/cart`);
  }

  const customer = await container
    .getUserProfileUseCase()
    .execute(session.user.id);
  const initialAddress = customer?.deliveryAddress ?? null;

  const {
    currency,
    sellerGroups,
    subtotal,
    discount,
    shipping,
    total,
    isFirstPurchase,
    discountRate,
    hasMissingCustomizations,
  } = checkout;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{dict.common.checkout}</h2>

      <Card className={styles.checkoutCard}>
        {hasMissingCustomizations && (
          <div className={styles.warning} role="alert">
            {dict.common.checkoutMissingCustomizations}
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
                          c.size != null &&
                            `${dict.common.customizationSize}: ${c.size}`,
                          c.color &&
                            `${dict.common.customizationColor}: ${c.color}`,
                          c.text &&
                            `${dict.common.customizationText}: ${c.text}`,
                        ]),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                  {item.customizations[0]?.imageUrl && (
                    <Image
                      src={item.customizations[0].imageUrl}
                      alt={dict.common.customizationPreview}
                      width={48}
                      height={48}
                      className={styles.itemCustomizationThumbnail}
                    />
                  )}
                  {item.customizationIdList.length >
                    item.customizations.length && (
                    <span className={styles.itemCustomizationRemoved}>
                      {dict.common.customizationRemoved}
                    </span>
                  )}
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.itemQty}>×{item.quantity}</span>
                  <span className={styles.itemLineTotal}>
                    {Money.format(item.lineTotal, item.currency)}
                  </span>
                </div>
              </div>
            ))}
            <div className={styles.sellerSubtotal}>
              <span>{dict.common.subtotal}</span>
              <span>{Money.format(group.subtotal, currency)}</span>
            </div>
          </div>
        ))}

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>{dict.common.subtotal}</span>
            <span>{Money.format(subtotal, currency)}</span>
          </div>
          {isFirstPurchase && (
            <div className={styles.totalRow}>
              <span>
                {dict.common.firstPurchaseDiscount
                  .split('{rate}')
                  .join((discountRate * 100).toString())}
              </span>
              <span className={styles.discount}>
                −{Money.format(discount, currency)}
              </span>
            </div>
          )}
          <div className={styles.totalRow}>
            <span>{dict.common.shipping}</span>
            <span>{Money.format(shipping, currency)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>{dict.common.total}</span>
            <span>{Money.format(total, currency)}</span>
          </div>
        </div>

        <CheckoutConfirmButton
          locale={locale}
          initialAddress={initialAddress}
        />
      </Card>
    </div>
  );
}
