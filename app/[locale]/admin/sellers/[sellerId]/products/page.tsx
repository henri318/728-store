import { redirect } from 'next/navigation';
import Link from 'next/link';
import { container } from '@/composition-root/container';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';
import { GetSellerUseCase } from '@/modules/sellers/application/use-cases/get-seller-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { assertRole } from '@/shared/authorization/authorization';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import { ProductActions } from '@/modules/products/presentation/components/product-actions';
import { SearchForm } from '@/shared/ui/search-form';
import styles from './page.module.css';

function buildPageUrl(
  locale: string,
  sellerId: string,
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
  return `/${locale}/admin/sellers/${sellerId}/products${query ? `?${query}` : ''}`;
}

export default async function AdminSellerProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; sellerId: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { locale, sellerId } = await params;
  const { q, page: pageStr, pageSize: pageSizeStr } = await searchParams;

  // Server-side role check — throws if not ADMIN
  try {
    await assertRole('ADMIN');
  } catch {
    redirect(`/${locale}`);
  }

  const filter = productListQuerySchema.parse({
    q,
    page: pageStr,
    pageSize: pageSizeStr,
    lang: locale,
    sellerId,
  });

  const dict = await getDictionary(locale as 'es' | 'cat');

  const sellerRepository = container.getSellerRepository();
  const getSeller = new GetSellerUseCase(sellerRepository);
  const sellerName = (await getSeller.execute({ sellerId })).name;

  const productRepository = container.getProductRepository();
  const useCase = new ProductListQueryUseCase(productRepository);
  const result = await useCase.execute(filter);
  const { items: products, totalPages } = result;
  let page = result.page;

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

  if (totalPages > 0 && page > totalPages) {
    page = totalPages;
  }
  const hasProducts = products.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link href={`/${locale}/admin/sellers`} className={styles.backLink}>
            <span aria-hidden="true">&larr; </span>
            <span>{dict.admin.backToSellers}</span>
          </Link>
          <h2 className={styles.title}>
            {dict.admin.sellerProductsTitle}: {sellerName}
          </h2>
        </div>
        <div className={styles.searchWrap}>
          <SearchForm
            placeholder={dict.admin.searchProductsPlaceholder}
            ariaLabel={dict.admin.searchProducts}
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
                {products.map((product) => (
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
            {page > 1 ? (
              <Link
                href={buildPageUrl(locale, sellerId, filter, page - 1)}
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
            {page < totalPages ? (
              <Link
                href={buildPageUrl(locale, sellerId, filter, page + 1)}
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
        <p className={styles.noProducts}>{dict.admin.noProducts}</p>
      )}
    </div>
  );
}
