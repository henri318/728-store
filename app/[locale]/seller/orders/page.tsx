import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect, notFound } from 'next/navigation';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { orderListQuerySchema } from '@/modules/orders/presentation/schemas/order-schemas';
import { ListSellerOrdersUseCase } from '@/modules/orders/application/list-seller-orders-use-case';
import { NotFoundError } from '@/shared/kernel/app-error';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

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
  const filterResult = orderListQuerySchema.safeParse(query);
  const filter = filterResult.success ? filterResult.data : {
    status: 'all' as const,
    page: 1,
    pageSize: 10,
    sortDir: 'desc' as const,
  };
  const useCase = new ListSellerOrdersUseCase(
    container.getSellerLookup(),
    container.getOrderRepository(),
  );

  let result;
  try {
    result = await useCase.execute({
      userId: session.user.id,
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
      sortBy: 'createdAt',
      sortDir: filter.sortDir,
    });
  } catch (error) {
    if (error instanceof NotFoundError && error.message === 'Seller not found') {
      notFound();
    }
    throw error;
  }

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
              <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString(locale) : ''}</td>
              <td>{Money.format(order.total, Currency.EUR)}</td>
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

      {result.totalPages > 1 && (
        <div>
          {result.page > 1 && (
            <a href={`/${locale}/seller/orders?page=${result.page - 1}&pageSize=${result.pageSize}&status=${filter.status}&sortDir=${filter.sortDir}`}>
              {dict.admin?.pagePrev ?? '← Previous'}
            </a>
          )}
          <span>
            {(dict.admin?.pageXofY ?? 'Page {current} of {total}')
              .replace('{current}', result.page.toString())
              .replace('{total}', result.totalPages.toString())}
          </span>
          {result.page < result.totalPages && (
            <a href={`/${locale}/seller/orders?page=${result.page + 1}&pageSize=${result.pageSize}&status=${filter.status}&sortDir=${filter.sortDir}`}>
              {dict.admin?.pageNext ?? 'Next →'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
