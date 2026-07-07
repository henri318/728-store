import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect } from 'next/navigation';
import { orderListQuerySchema } from '@/modules/orders/presentation/schemas/order-schemas';
import { ListCustomerOrdersUseCase } from '@/modules/orders/application/list-customer-orders-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { Pagination } from '@/shared/ui/pagination';
import { Card } from '@/shared/ui/card';
import { SearchForm } from '@/shared/ui/search-form';
import type { OrderEntity } from '@/modules/orders/domain/order-repository';
import { createOrderCommonColumns } from '@/modules/orders/presentation/components/order-table-columns';
import { computePaginationState } from '@/shared/presentation/pagination-utils';
import { buildOrderPageUrl } from '@/modules/orders/presentation/order-page-url';
import styles from './page.module.css';

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
    q?: string;
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
  const filter = filterResult.success
    ? filterResult.data
    : {
        status: 'all' as const,
        page: 1,
        pageSize: 10,
        sortDir: 'desc' as const,
      };
  const useCase = new ListCustomerOrdersUseCase(container.getOrderRepository());

  const result = await useCase.execute(
    {
      userId: session.user.id,
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
      sortBy: 'createdAt',
      sortDir: filter.sortDir,
      q: filter.q,
    },
    locale,
  );

  const columns: DataTableColumn<OrderEntity>[] = [
    ...createOrderCommonColumns(
      locale,
      dict.orders?.status ?? 'Status',
      dict.orders?.date ?? 'Date',
      dict.orders?.total ?? 'Total',
      dict.orders ?? {},
    ),
    {
      key: 'actions',
      header: dict.orders?.actions ?? 'Actions',
      render: (order) => (
        <div className={styles.actionCell}>
          <a
            href={`/${locale}/orders/${order.id}`}
            className={styles.viewButton}
          >
            {dict.orders?.viewOrder ?? 'View order'}
          </a>
          {order.checkoutGroupId &&
            order.checkoutGroupPaymentStatus === 'failed' && (
              <form
                method="post"
                action={`/api/payments/checkout-groups/${order.checkoutGroupId}/retry`}
                className={styles.retryForm}
              >
                <button type="submit" className={styles.retryButton}>
                  {dict.orders?.retryPayment ?? 'Retry payment'}
                </button>
              </form>
            )}
        </div>
      ),
    },
  ];

  const { hasItems: hasOrders, currentPage } = computePaginationState(result);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLead}>
          <h1 className={styles.title}>
            {dict.orders?.myOrders ?? 'My orders'}
          </h1>
          <div className={styles.searchWrap}>
            <SearchForm
              placeholder={
                dict.orders?.searchItemsPlaceholder ?? 'Search my orders...'
              }
              ariaLabel={dict.orders?.searchItems ?? 'Search by product'}
              defaultValue={filter.q}
              hiddenFields={
                filter.status === 'all' ? undefined : { status: filter.status }
              }
            />
          </div>
        </div>
      </div>

      {hasOrders ? (
        <>
          <div className={styles.tableWrap}>
            <DataTable
              columns={columns}
              rows={result.items}
              rowKey={(o) => o.id}
            />
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={result.totalPages}
            buildPageUrl={(page) =>
              buildOrderPageUrl(locale, '/orders', filter, page)
            }
            prevLabel={dict.orders?.previous ?? '← Previous'}
            nextLabel={dict.orders?.next ?? 'Next →'}
          />
        </>
      ) : (
        <Card className={styles.emptyState}>
          {dict.orders?.noOrders ?? 'No orders yet'}
        </Card>
      )}
    </div>
  );
}
