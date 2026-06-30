import Link from 'next/link';
import { container } from '@/composition-root/container';
import { NotFoundError } from '@/shared/kernel/app-error';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { ListSellerProductsUseCase } from '@/modules/sellers/application/use-cases/list-seller-products-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { SearchForm } from '@/shared/ui/search-form';
import { ProductActions } from '@/modules/products/presentation/components/product-actions';
import styles from './page.module.css';

function buildPageUrl(
  locale: string,
  filter: {
    q?: string;
    pageSize: number;
  },
  page: number,
): string {
  const search = new URLSearchParams();

  if (filter.q) search.set('q', filter.q);
  if (page > 1) search.set('page', String(page));
  if (filter.pageSize !== PaginationDefaults.pageSize) {
    search.set('pageSize', String(filter.pageSize));
  }

  const query = search.toString();
  return `/${locale}/seller/products${query ? `?${query}` : ''}`;
}

export default async function SellerProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { locale } = await params;
  const { q, page: pageStr, pageSize: pageSizeStr } = await searchParams;
  const session = await container.getSession().getSession();

  const dict = await getDictionary(locale as 'es' | 'cat');
  const filter = productListQuerySchema.parse({
    q,
    page: pageStr,
    pageSize: pageSizeStr,
    lang: locale,
  });

  const sellerRepository = container.getSellerRepository();
  const productRepository = container.getProductRepository();
  const useCase = new ListSellerProductsUseCase(
    sellerRepository,
    new ProductListQueryUseCase(productRepository),
  );

  const fallbackResult: PaginatedResult<ProductEntity> = {
    items: [],
    total: 0,
    page: filter.page,
    pageSize: filter.pageSize,
    totalPages: 0,
  };

  const result = (await useCase
    .execute({
      userId: session?.id ?? '',
      q: filter.q,
      page: filter.page,
      pageSize: filter.pageSize,
      lang: filter.lang,
      sortBy: filter.sortBy,
      sortDir: filter.sortDir,
    })
    .catch((error: unknown) => {
      if (error instanceof NotFoundError) {
        return fallbackResult;
      }

      throw error;
    })) as PaginatedResult<ProductEntity>;

  const hasProducts = result.items.length > 0;
  const currentPage =
    result.totalPages > 0 && result.page > result.totalPages
      ? result.totalPages
      : result.page;

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return dict.admin.status_draft;
      case 'ACTIVE':
        return dict.admin.status_active;
      case 'ARCHIVED':
        return dict.admin.status_archived;
      case 'ELIMINATED':
        return dict.admin.status_eliminated;
      default:
        return status;
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{dict.sellerDashboard.title}</h2>
        </div>
        <div className={styles.searchWrap}>
          <SearchForm
            placeholder={dict.sellerDashboard.searchPlaceholder}
            ariaLabel={dict.sellerDashboard.searchProducts}
            defaultValue={filter.q ?? ''}
            hiddenFields={{ pageSize: String(filter.pageSize) }}
          />
        </div>
      </div>

      {hasProducts ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{dict.admin.productName}</th>
                  <th>{dict.admin.productStatus}</th>
                  <th>{dict.admin.productPrice}</th>
                  <th>{dict.admin.productUpdated}</th>
                  <th>{dict.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((product) => (
                  <tr key={product.id}>
                    <td className={styles.nameCell}>
                      {product.translations.find(
                        (translation) => translation.locale === locale,
                      )?.name ?? dict.admin.untranslatedProduct}
                    </td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        data-status={product.status.toLowerCase()}
                      >
                        {getStatusLabel(product.status)}
                      </span>
                    </td>
                    <td>{product.basePrice.format()}</td>
                    <td>
                      {LocalizedDate.create(
                        product.updatedAt,
                        locale,
                      ).toString()}
                    </td>
                    <td>
                      <ProductActions
                        productId={product.id}
                        currentStatus={product.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav
            className={styles.pagination}
            aria-label={dict.admin.paginationAriaLabel}
          >
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(locale, filter, currentPage - 1)}
                className={styles.pageButton}
              >
                {dict.admin.pagePrev}
              </Link>
            ) : (
              <span
                className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
              >
                {dict.admin.pagePrev}
              </span>
            )}
            {currentPage < result.totalPages ? (
              <Link
                href={buildPageUrl(locale, filter, currentPage + 1)}
                className={styles.pageButton}
              >
                {dict.admin.pageNext}
              </Link>
            ) : (
              <span
                className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
              >
                {dict.admin.pageNext}
              </span>
            )}
          </nav>
        </>
      ) : (
        <p className={styles.noProducts}>{dict.sellerDashboard.noProducts}</p>
      )}
    </div>
  );
}
