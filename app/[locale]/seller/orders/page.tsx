import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { redirect, notFound } from 'next/navigation';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { orderListQuerySchema } from '@/modules/orders/presentation/schemas/order-schemas';
import { ListSellerOrdersUseCase } from '@/modules/orders/application/list-seller-orders-use-case';
import { NotFoundError } from '@/shared/kernel/app-error';

import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { Pagination } from '@/shared/ui/pagination';
import { Card } from '@/shared/ui/card';
import type { OrderEntity } from '@/modules/orders/domain/order-repository';
import { createOrderCommonColumns } from '@/modules/orders/presentation/components/order-table-columns';
import { computePaginationState } from '@/shared/presentation/pagination-utils';
import {
  buildOrderPageUrl,
  DEFAULT_ORDER_PAGE_SIZE,
} from '@/modules/orders/presentation/order-page-url';
import styles from './page.module.css';

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
  const filter = filterResult.success
    ? filterResult.data
    : {
        status: 'all' as const,
        page: 1,
        pageSize: DEFAULT_ORDER_PAGE_SIZE,
        sortDir: 'desc' as const,
      };
  const useCase = new ListSellerOrdersUseCase(
    container.getSellerLookup(),
    container.getOrderRepository(),
  );

  let result;
  try {
    result = await useCase.execute(
      {
        userId: session.user.id,
        status: filter.status,
        page: filter.page,
        pageSize: filter.pageSize,
        sortBy: 'createdAt',
        sortDir: filter.sortDir,
      },
      locale,
    );
  } catch (error) {
    if (
      error instanceof NotFoundError &&
      error.message === 'Seller not found'
    ) {
      notFound();
    }
    throw error;
  }

  const columns: DataTableColumn<OrderEntity>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (order) => (
        <span className={styles.idCell}>#{order.id.slice(0, 8)}</span>
      ),
    },
    ...createOrderCommonColumns(
      locale,
      dict.sellerDashboard?.status ?? 'Status',
      dict.sellerDashboard?.createdAt ?? 'Date',
      dict.sellerDashboard?.total ?? 'Total',
      dict.orders ?? {},
    ),
    {
      key: 'actions',
      header: dict.sellerDashboard?.actions ?? 'Actions',
      render: (order) => (
        <div className={styles.actionCell}>
          <a
            href={`/${locale}/seller/orders/${order.id}`}
            className={styles.viewLink}
          >
            {dict.orders?.viewOrder ?? 'Ver pedido'}
          </a>
          {order.status === 'new' && (
            <form
              method="post"
              action={`/api/orders/${order.id}/status`}
              className={styles.statusForm}
            >
              <input type="hidden" name="status" value="in_progress" />
              <button type="submit" className={styles.statusButton}>
                {dict.orders?.moveToInProgress ?? 'Move to in progress'}
              </button>
            </form>
          )}
          {order.status === 'in_progress' && (
            <form
              method="post"
              action={`/api/orders/${order.id}/status`}
              className={styles.statusForm}
            >
              <input type="hidden" name="status" value="completed" />
              <button
                type="submit"
                className={`${styles.statusButton} ${styles.statusButtonSecondary}`}
              >
                {dict.orders?.markCompleted ?? 'Mark completed'}
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
            {dict.orders?.sellerOrdersTitle ?? 'Seller orders'}
          </h1>
        </div>

        <form method="get" className={styles.filterForm}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-status">
              {dict.orders?.filterStatus ?? 'Status'}
            </label>
            <select
              name="status"
              id="filter-status"
              defaultValue={filter.status}
              className={styles.filterSelect}
            >
              <option value="all">{dict.orders?.all ?? 'All'}</option>
              <option value="new">{dict.orders?.new ?? 'New'}</option>
              <option value="in_progress">
                {dict.orders?.inProgress ?? 'In progress'}
              </option>
              <option value="completed">
                {dict.orders?.completed ?? 'Completed'}
              </option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-sort">
              {dict.orders?.sortBy ?? 'Sort by'}
            </label>
            <select
              name="sortDir"
              id="filter-sort"
              defaultValue={filter.sortDir}
              className={styles.filterSelect}
            >
              <option value="desc">
                {dict.orders?.sortDescending ?? 'Newest'}
              </option>
              <option value="asc">
                {dict.orders?.sortAscending ?? 'Oldest'}
              </option>
            </select>
          </div>
          <input type="hidden" name="pageSize" value={filter.pageSize} />
          <button type="submit" className={styles.filterSubmit}>
            {dict.common?.submit ?? 'Filter'}
          </button>
        </form>
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
              buildOrderPageUrl(locale, '/seller/orders', filter, page)
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
