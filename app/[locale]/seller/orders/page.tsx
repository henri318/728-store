import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { orderListQuerySchema } from '@/modules/orders/presentation/schemas/order-schemas';
import { ListSellerOrdersUseCase } from '@/modules/orders/application/list-seller-orders-use-case';

export default async function SellerOrdersPage({
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
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/seller/orders`);
  }

  const dict = await getDictionary(locale as 'es' | 'cat');
  const filter = orderListQuerySchema.parse(query);
  const useCase = new ListSellerOrdersUseCase(
    container.getSellerLookup(),
    container.getOrderRepository(),
  );

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
      <h1>{dict.sellerDashboard?.title ?? 'Seller orders'}</h1>

      <form method="get">
        <label>
          {dict.sellerDashboard?.filterStatus ?? 'Status'}
          <select name="status" defaultValue={filter.status}>
            <option value="all">
              {dict.sellerDashboard?.allStatuses ?? 'All'}
            </option>
            <option value="new">{dict.sellerDashboard?.new ?? 'New'}</option>
            <option value="in_progress">
              {dict.sellerDashboard?.inProgress ?? 'In progress'}
            </option>
            <option value="completed">
              {dict.sellerDashboard?.completed ?? 'Completed'}
            </option>
          </select>
        </label>
        <label>
          {dict.sellerDashboard?.sortBy ?? 'Sort by'}
          <select name="sortDir" defaultValue={filter.sortDir}>
            <option value="desc">
              {dict.sellerDashboard?.sortDescending ?? 'Newest'}
            </option>
            <option value="asc">
              {dict.sellerDashboard?.sortAscending ?? 'Oldest'}
            </option>
          </select>
        </label>
        <input type="hidden" name="pageSize" value={filter.pageSize} />
        <button type="submit">{dict.common?.submit ?? 'Submit'}</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>{dict.sellerDashboard?.status ?? 'Status'}</th>
            <th>{dict.sellerDashboard?.createdAt ?? 'Date'}</th>
            <th>{dict.sellerDashboard?.total ?? 'Total'}</th>
            <th>{dict.sellerDashboard?.actions ?? 'Actions'}</th>
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
                {order.status === 'new' && (
                  <form method="post" action={`/api/orders/${order.id}/status`}>
                    <input type="hidden" name="status" value="in_progress" />
                    <button type="submit">Move to in progress</button>
                  </form>
                )}
                {order.status === 'in_progress' && (
                  <form method="post" action={`/api/orders/${order.id}/status`}>
                    <input type="hidden" name="status" value="completed" />
                    <button type="submit">Mark completed</button>
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
