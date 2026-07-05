import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect, notFound } from 'next/navigation';

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

  const orderRepository = container.getOrderRepository();
  const order = await orderRepository.findById(orderId);

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  return (
    <div>
      <h1>{order.id}</h1>
      <p>Status: {order.status}</p>
      <p>Total: {order.total}</p>
      {order.checkoutGroupId &&
        order.checkoutGroupPaymentStatus === 'failed' && (
          <form
            method="post"
            action={`/api/payments/checkout-groups/${order.checkoutGroupId}/retry`}
          >
            <button type="submit">Retry payment</button>
          </form>
        )}
    </div>
  );
}
