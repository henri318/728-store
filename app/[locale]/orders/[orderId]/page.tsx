import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect, notFound } from 'next/navigation';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

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
  const order = await orderRepository.findById(orderId);

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  return (
    <div>
      <h1>{order.id}</h1>
      <p>
        {dict.orders?.status ?? 'Status'}: {order.status}
      </p>
      <p>
        {dict.orders?.total ?? 'Total'}:{' '}
        {Money.format(order.total, Currency.EUR)}
      </p>
      {order.checkoutGroupId &&
        order.checkoutGroupPaymentStatus === 'failed' && (
          <form
            method="post"
            action={`/api/payments/checkout-groups/${order.checkoutGroupId}/retry`}
          >
            <button type="submit">
              {dict.orders?.retryPayment ?? 'Retry payment'}
            </button>
          </form>
        )}
    </div>
  );
}
