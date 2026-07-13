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
import Image from 'next/image';
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
  const orderRepository = container.getOrderRepository();
  const order = await orderRepository.findById(orderId, locale);

  if (!order || order.userId !== session.user.id) {
    notFound();
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

        <Card className={styles.itemsCard}>
          <h2 className={styles.itemsTitle}>{dict.orders?.items}</h2>

          {items.length === 0 ? (
            <p className={styles.noItems}>{dict.orders?.noItems}</p>
          ) : (
            <div className={styles.itemsList}>
              {items.map((item) => {
                const customImage = item.customizationSnapshot?.find(
                  (c) => c.imageUrl,
                )?.imageUrl;
                const displayImage = customImage ?? item.productImageUrl;
                const lineTotal =
                  item.unitPrice == null
                    ? undefined
                    : item.unitPrice * item.quantity;

                return (
                  <div key={item.id} className={styles.itemRow}>
                    {displayImage && (
                      <Image
                        src={displayImage}
                        alt={item.productName ?? ''}
                        width={56}
                        height={56}
                        className={styles.itemImage}
                      />
                    )}
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>
                        {item.productName ?? item.productId}
                      </span>
                      {item.customizationSnapshot &&
                        item.customizationSnapshot.length > 0 && (
                          <span className={styles.itemCustomization}>
                            {item.customizationSnapshot
                              .flatMap((c) => [
                                c.size != null &&
                                  `${dict.common.customizationSize}: ${c.size}`,
                                c.color &&
                                  `${dict.common.customizationColor}: ${c.color}`,
                                c.text &&
                                  `${dict.common.customizationText}: ${c.text}`,
                              ])
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
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
