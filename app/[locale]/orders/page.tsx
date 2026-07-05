import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect } from 'next/navigation';
import { orderListQuerySchema } from '@/modules/orders/presentation/schemas/order-schemas';
import { ListCustomerOrdersUseCase } from '@/modules/orders/application/list-customer-orders-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

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

  const dict = await getDictionary(locale as 'es' | 'cat');
  const filterResult = orderListQuerySchema.safeParse(query);
  const filter = filterResult.success ? filterResult.data : {
    status: 'all' as const,
    page: 1,
    pageSize: 10,
    sortDir: 'desc' as const,
  };
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
      <h1>{dict.orders?.myOrders ?? 'My orders'}</h1>

      <table>
        <thead>
          <tr>
            <th>{dict.orders?.id ?? 'ID'}</th>
            <th>{dict.orders?.status ?? 'Status'}</th>
            <th>{dict.orders?.date ?? 'Date'}</th>
            <th>{dict.orders?.total ?? 'Total'}</th>
            <th>{dict.orders?.actions ?? 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.status}</td>
              <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString(locale) : ''}</td>
              <td>{Money.format(order.total, Currency.EUR)}</td>
              <td>
                <a href={`/${locale}/orders/${order.id}`}>{dict.orders?.viewOrder ?? 'View order'}</a>
                {order.checkoutGroupId &&
                  order.checkoutGroupPaymentStatus === 'failed' && (
                    <form
                      method="post"
                      action={`/api/payments/checkout-groups/${order.checkoutGroupId}/retry`}
                    >
                      <button type="submit">{dict.orders?.retryPayment ?? 'Retry payment'}</button>
                    </form>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {result.totalPages > 1 && (
        <div>
          {result.page > 1 && (
            <a href={`/${locale}/orders?page=${result.page - 1}&pageSize=${result.pageSize}&status=${filter.status}&sortDir=${filter.sortDir}`}>
              {dict.orders?.previous ?? '← Previous'}
            </a>
          )}
          <span>
            {(dict.orders?.pageXofY ?? 'Page {current} of {total}')
              .replace('{current}', result.page.toString())
              .replace('{total}', result.totalPages.toString())}
          </span>
          {result.page < result.totalPages && (
            <a href={`/${locale}/orders?page=${result.page + 1}&pageSize=${result.pageSize}&status=${filter.status}&sortDir=${filter.sortDir}`}>
              {dict.orders?.next ?? 'Next →'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
