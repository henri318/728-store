import { redirect } from 'next/navigation';
import { container } from '@/composition-root/container';
import { ListSellersUseCase } from '@/modules/sellers/application/use-cases/list-sellers-use-case';
import { listSellersQuerySchema } from '@/modules/sellers/presentation/schemas/seller-schemas';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { assertRole } from '@/shared/authorization/authorization';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { SellerActions } from './seller-actions';
import { SellerDelete } from './seller-delete';
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

  try {
    await assertRole('ADMIN');
  } catch {
    redirect(`/${locale}`);
  }

  const filter = listSellersQuerySchema.parse({
    page: pageStr,
    pageSize: pageSizeStr,
    q,
    sortBy,
    sortDir,
  });

  function buildPageUrl(
    targetPage: number,
    size: number,
    query?: string,
    sort?: string,
    direction?: string,
  ): string {
    const search = new URLSearchParams();
    if (targetPage > 1) search.set('page', String(targetPage));
    if (size !== PAGE_SIZE) search.set('pageSize', String(size));
    if (query) search.set('q', query);
    if (sort) search.set('sortBy', sort);
    if (direction) search.set('sortDir', direction);
    const params = search.toString();
    return `/${locale}/admin/sellers${params ? `?${params}` : ''}`;
  }

  const dict = await getDictionary(locale as 'es' | 'cat');
  const sellerRepository = container.getSellerRepository();
  const useCase = new ListSellersUseCase(sellerRepository);
  const result = await useCase.execute(filter);
  const { items: sellers, page: currentPage, pageSize, totalPages } = result;

  // Redirect to valid page if current page is out of range
  if (currentPage > totalPages && totalPages > 0) {
    redirect(
      buildPageUrl(
        totalPages,
        pageSize,
        filter.q,
        filter.sortBy,
        filter.sortDir,
      ),
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{dict.admin.sellersTitle}</h2>
        <a
          href={`/${locale}/admin/sellers/create`}
          className={styles.createButton}
        >
          + {dict.admin.createSeller}
        </a>
      </div>
      {sellers.length === 0 ? (
        <p className={styles.noSellers}>{dict.admin.noSellers}</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{dict.admin.sellerName}</th>
                <th>{dict.admin.sellerDescriptionList}</th>
                <th>{dict.admin.sellerStatus}</th>
                <th>{dict.admin.sellerCreated}</th>
                <th>{dict.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller.sellerId.value}>
                  <td className={styles.nameCell}>{seller.name}</td>
                  <td className={styles.descriptionCell}>
                    {seller.description ?? '—'}
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      data-testid={`status-badge-${seller.sellerId.value}`}
                      data-status={seller.status}
                    >
                      {dict.admin[
                        `status_${seller.status}` as keyof typeof dict.admin
                      ] ?? seller.status}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {LocalizedDate.create(seller.createdAt, locale).toString()}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <a
                        href={`/${locale}/admin/sellers/${seller.sellerId.value}/products`}
                        className={styles.viewProducts}
                      >
                        {dict.admin.viewProducts}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.pagination}>
            {currentPage <= 1 ? (
              <span
                className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
              >
                {dict.admin.pagePrev}
              </span>
            ) : (
              <a
                href={buildPageUrl(
                  currentPage - 1,
                  pageSize,
                  filter.q,
                  filter.sortBy,
                  filter.sortDir,
                )}
                className={styles.pageButton}
              >
                {dict.admin.pagePrev}
              </a>
            )}
            <span className={styles.pageInfo}>
              {dict.admin.pageXofY
                .replace('{current}', String(currentPage))
                .replace('{total}', String(totalPages))}
            </span>
            {currentPage >= totalPages ? (
              <span
                className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
              >
                {dict.admin.pageNext}
              </span>
            ) : (
              <a
                href={buildPageUrl(
                  currentPage + 1,
                  pageSize,
                  filter.q,
                  filter.sortBy,
                  filter.sortDir,
                )}
                className={styles.pageButton}
              >
                {dict.admin.pageNext}
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
