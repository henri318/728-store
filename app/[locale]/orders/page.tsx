import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect } from 'next/navigation';
import { orderListQuerySchema } from '@/modules/orders/presentation/schemas/order-schemas';
import { ListCustomerOrdersUseCase } from '@/modules/orders/application/list-customer-orders-use-case';

export default async function CustomerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
    sortDir?: string;
  }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/orders`);
  }

  const filter = orderListQuerySchema.parse(query);
  const useCase = new ListCustomerOrdersUseCase(container.getOrderRepository());

  const result = await useCase.execute({
    userId: session.user.id,
    status: filter.status,
    page: filter.page,
    pageSize: filter.pageSize,
    sortBy: 'createdAt',
    sortDir: filter.sortDir,
  });

  return (
    <div>
      <h1>My orders</h1>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Date</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.status}</td>
              <td>{order.createdAt?.toISOString?.() ?? ''}</td>
              <td>{order.total}</td>
              <td>
                <a href={`/${locale}/orders/${order.id}`}>View order</a>
                {order.checkoutGroupId &&
                  order.checkoutGroupPaymentStatus === 'failed' && (
                    <form
                      method="post"
                      action={`/api/payments/checkout-groups/${order.checkoutGroupId}/retry`}
                    >
                      <button type="submit">Retry payment</button>
                    </form>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
