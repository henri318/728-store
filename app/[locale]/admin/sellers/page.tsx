import { redirect } from 'next/navigation';
import { container } from '@/composition-root/container';
import { ListSellersUseCase } from '@/modules/sellers/application/use-cases/list-sellers-use-case';
import { listSellersQuerySchema } from '@/modules/sellers/presentation/schemas/seller-schemas';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { SellerActions } from '@/modules/sellers/presentation/components/seller-actions';
import { SellerDelete } from '@/modules/sellers/presentation/components/seller-delete';
import { SearchForm } from '@/shared/ui/search-form';
import { DataTable } from '@/shared/ui/data-table';
import type { DataTableColumn } from '@/shared/ui/data-table';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Pagination } from '@/shared/ui/pagination';
import { requireAdmin } from '@/shared/authorization/require-admin';
import { buildPageUrl } from '@/shared/presentation/build-page-url';
import {
  resolveStatusLabel,
  SELLER_STATUS_LABELS,
} from '@/shared/presentation/status-labels';
import type { SellerEntity } from '@/modules/sellers/domain/seller';
import styles from './page.module.css';

const PAGE_SIZE = 20;

export default async function AdminSellersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}) {
  const { locale } = await params;
  const {
    page: pageStr,
    pageSize: pageSizeStr,
    q,
    sortBy,
    sortDir,
  } = await searchParams;

  await requireAdmin(locale);

  const filter = listSellersQuerySchema.parse({
    page: pageStr,
    pageSize: pageSizeStr,
    q,
    sortBy,
    sortDir,
  });

  const dict = await getDictionary(locale as 'es' | 'cat');
  const sellerRepository = container.getSellerRepository();
  const useCase = new ListSellersUseCase(sellerRepository);
  const result = await useCase.execute(filter);
  const { items: sellers, page: currentPage, pageSize, totalPages } = result;

  // Redirect to valid page if current page is out of range
  if (currentPage > totalPages && totalPages > 0) {
    redirect(
      buildPageUrl(`/${locale}/admin/sellers`, totalPages, {
        q: filter.q,
        pageSize,
        defaultPageSize: PAGE_SIZE,
        sortBy: filter.sortBy,
        sortDir: filter.sortDir,
      }),
    );
  }

  const columns: DataTableColumn<SellerEntity>[] = [
    {
      key: 'name',
      header: dict.admin.sellerName,
      render: (seller) => (
        <span className={styles.nameCell}>{seller.name}</span>
      ),
    },
    {
      key: 'description',
      header: dict.admin.sellerDescriptionList,
      render: (seller) => (
        <span className={styles.descriptionCell}>
          {seller.description ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: dict.admin.sellerStatus,
      render: (seller) => (
        <span
          data-testid={`status-badge-${seller.sellerId.value}`}
          data-status={seller.status}
        >
          <StatusBadge
            status={seller.status}
            label={resolveStatusLabel(
              seller.status,
              SELLER_STATUS_LABELS,
              dict.admin,
            )}
          />
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: dict.admin.sellerCreated,
      render: (seller) => (
        <span className={styles.dateCell}>
          {LocalizedDate.create(seller.createdAt, locale).toString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: dict.admin.actions,
      render: (seller) => (
        <div className={styles.actionsCell}>
          <a
            href={`/${locale}/admin/sellers/${seller.sellerId.value}/products`}
            className={styles.viewProducts}
          >
            {dict.admin.viewProducts}
          </a>
          <a
            href={`/${locale}/admin/sellers/${seller.sellerId.value}`}
            className={styles.editLink}
          >
            {dict.admin.edit}
          </a>
          <SellerActions
            sellerId={seller.sellerId.value}
            currentStatus={seller.status}
          />
          <SellerDelete
            sellerId={seller.sellerId.value}
            sellerName={seller.name}
          />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{dict.admin.sellersTitle}</h2>
        <div className={styles.headerActions}>
          <a
            href={`/${locale}/admin/sellers/create`}
            className={styles.createButton}
          >
            + {dict.admin.createSeller}
          </a>
          <SearchForm
            placeholder={dict.admin.searchSellersPlaceholder}
            ariaLabel={dict.admin.searchSellers}
            defaultValue={filter.q ?? ''}
            hiddenFields={{
              pageSize: String(pageSize),
              ...(filter.sortBy ? { sortBy: filter.sortBy } : {}),
              ...(filter.sortDir ? { sortDir: filter.sortDir } : {}),
            }}
          />
        </div>
      </div>
      {sellers.length === 0 ? (
        <p className={styles.noSellers}>{dict.admin.noSellers}</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={sellers}
            rowKey={(s) => s.sellerId.value}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildPageUrl={(page) =>
              buildPageUrl(`/${locale}/admin/sellers`, page, {
                q: filter.q,
                pageSize,
                defaultPageSize: PAGE_SIZE,
                sortBy: filter.sortBy,
                sortDir: filter.sortDir,
              })
            }
            prevLabel={dict.admin.pagePrev}
            nextLabel={dict.admin.pageNext}
            pageInfo={dict.admin.pageXofY
              .replace('{current}', String(currentPage))
              .replace('{total}', String(totalPages))}
          />
        </>
      )}
    </div>
  );
}
