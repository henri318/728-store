import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect, notFound } from 'next/navigation';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Card } from '@/shared/ui/card';
import { BackLink } from '@/shared/ui/back-link';
import { normalizeLocale } from '@/shared/i18n/normalize-locale';
import { NotFoundError } from '@/shared/kernel/app-error';
import { OrderItemPreview } from '@/modules/orders/presentation/components/order-item-preview';
import styles from './page.module.css';

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'new',
  in_progress: 'inProgress',
  completed: 'completed',
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/orders/${orderId}`);
  }

  const dict = await getDictionary(locale as 'es' | 'cat');
  const customerName = session.user?.name ?? null;

  const useCase = container.getCustomerOrderUseCase();

  let order;
  try {
    order = await useCase.execute(orderId, session.user.id, locale);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const statusLabelKey = ORDER_STATUS_LABELS[order.status];
  const statusLabel = statusLabelKey
    ? (dict.orders?.[statusLabelKey] ?? order.status)
    : order.status;

  const items = order.lineItems ?? [];

  return (
    <div className={styles.container}>
      <BackLink href={`/${locale}/orders`}>← {dict.orders?.myOrders}</BackLink>

      <div className={styles.content}>
        <Card padding="lg">
          <h1 className={styles.title}>{dict.orders?.myOrders}</h1>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{dict.orders?.status}</span>
            <StatusBadge status={order.status} label={statusLabel} />
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{dict.orders?.total}</span>
            <span className={styles.detailValue}>
              {Money.format(order.total, Currency.EUR)}
            </span>
          </div>

          {order.createdAt && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{dict.orders?.date}</span>
              <span className={styles.detailValue}>
                {new Date(order.createdAt).toLocaleDateString(
                  normalizeLocale(locale),
                )}
              </span>
            </div>
          )}
        </Card>

        {order.deliveryAddress && (
          <Card padding="lg">
            <h2 className={styles.addressTitle}>
              {dict.orders?.deliveryAddress ?? 'Dirección de entrega'}
            </h2>
            <div className={styles.addressBlock}>
              {customerName && (
                <p className={styles.addressLine}>{customerName}</p>
              )}
              <p className={styles.addressLine}>
                {[
                  order.deliveryAddress.street,
                  order.deliveryAddress.houseNumber,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {order.deliveryAddress.floor && (
                <p className={styles.addressLine}>
                  {dict.auth?.floor}: {order.deliveryAddress.floor}
                </p>
              )}
              {order.deliveryAddress.door && (
                <p className={styles.addressLine}>
                  {dict.auth?.door}: {order.deliveryAddress.door}
                </p>
              )}
              {order.deliveryAddress.postalCode && (
                <p className={styles.addressLine}>
                  {dict.auth?.postalCode}: {order.deliveryAddress.postalCode}
                </p>
              )}
              {order.deliveryAddress.city && (
                <p className={styles.addressLine}>
                  {dict.auth?.city}: {order.deliveryAddress.city}
                </p>
              )}
              <p className={styles.addressLine}>
                {order.deliveryAddress.country}
              </p>
              {order.deliveryAddress.instructions && (
                <p className={styles.addressNote}>
                  {order.deliveryAddress.instructions}
                </p>
              )}
            </div>
          </Card>
        )}

        <Card className={styles.itemsCard}>
          <h2 className={styles.itemsTitle}>{dict.orders?.items}</h2>

          {items.length === 0 ? (
            <p className={styles.noItems}>{dict.orders?.noItems}</p>
          ) : (
            <div className={styles.itemsList}>
              {items.map((item) => {
                const firstSnapshot = item.customizationSnapshot?.[0] ?? null;
                const designImageUrl = firstSnapshot?.imageUrl ?? null;
                const designPosition = firstSnapshot?.designPosition ?? null;
                const lineTotal =
                  item.unitPrice == null
                    ? undefined
                    : item.unitPrice * item.quantity;

                return (
                  <div key={item.id} className={styles.itemRow}>
                    <div className={styles.itemPreview}>
                      <OrderItemPreview
                        productImageUrl={item.productImageUrl ?? null}
                        designImageUrl={designImageUrl}
                        designPosition={designPosition}
                        productName={item.productName ?? item.productId}
                      />
                    </div>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>
                        {item.productName ?? item.productId}
                      </span>
                      {item.customizationSnapshot &&
                        item.customizationSnapshot.length > 0 && (
                          <div className={styles.itemCustomization}>
                            {item.customizationSnapshot.map((c) => (
                              <div
                                key={c.id}
                                className={styles.customizationLine}
                              >
                                {[
                                  c.size != null &&
                                    `${dict.common.customizationSize}: ${c.size}`,
                                  c.color &&
                                    `${dict.common.customizationColor}: ${c.color}`,
                                  c.text &&
                                    `${dict.common.customizationText}: ${c.text}`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                                {c.imageUrl && (
                                  <a
                                    href={c.imageUrl}
                                    download
                                    className={styles.downloadLink}
                                  >
                                    {dict.orders?.download ?? 'Descargar'}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className={styles.itemRight}>
                      <span className={styles.itemQty}>×{item.quantity}</span>
                      {lineTotal !== undefined && (
                        <span className={styles.itemLineTotal}>
                          {Money.format(lineTotal, Currency.EUR)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {order.checkoutGroupId &&
          order.checkoutGroupPaymentStatus === 'failed' && (
            <form
              method="post"
              action={`/api/payments/checkout-groups/${order.checkoutGroupId}/retry`}
              className={styles.retrySection}
            >
              <button type="submit" className={styles.retryButton}>
                {dict.orders?.retryPayment}
              </button>
            </form>
          )}
      </div>
    </div>
  );
}
