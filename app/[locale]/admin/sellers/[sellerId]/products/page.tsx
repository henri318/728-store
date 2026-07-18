import { BackLink } from '@/shared/ui/back-link';
import { container } from '@/composition-root/container';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import { SearchForm } from '@/shared/ui/search-form';
import { DataTable } from '@/shared/ui/data-table';
import { Pagination } from '@/shared/ui/pagination';
import { Card } from '@/shared/ui/card';
import { requireAdmin } from '@/shared/authorization/require-admin';
import { buildPageUrl } from '@/shared/presentation/build-page-url';
import { createProductTableColumns } from '@/modules/products/presentation/components/product-table-columns';
import styles from './page.module.css';

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

  await requireAdmin(locale);

  const filter = productListQuerySchema.parse({
    q,
    page: pageStr,
    pageSize: pageSizeStr,
    lang: locale,
    sellerId,
  });

  const dict = await getDictionary(locale as 'es' | 'cat');

  const seller = await container.getSellerUseCase().execute({ sellerId });
  const sellerName = seller.name;

  const result = await container
    .getProductListQueryUseCase()
    .execute({ ...filter, audience: 'admin' });
  const { items: products, totalPages } = result;
  let page = result.page;

  if (totalPages > 0 && page > totalPages) {
    page = totalPages;
  }
  const hasProducts = products.length > 0;

  const columns = createProductTableColumns(
    locale,
    dict.admin,
    dict.admin,
    styles,
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <BackLink href={`/${locale}/admin/sellers`}>
            {dict.admin.backToSellers}
          </BackLink>
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
            <DataTable columns={columns} rows={products} rowKey={(p) => p.id} />
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            buildPageUrl={(pageNum) =>
              buildPageUrl(
                `/${locale}/admin/sellers/${sellerId}/products`,
                pageNum,
                {
                  q: filter.q,
                  pageSize: filter.pageSize,
                  defaultPageSize: PaginationDefaults.pageSize,
                },
              )
            }
            prevLabel={dict.admin.pagePrev}
            nextLabel={dict.admin.pageNext}
            ariaLabel={dict.admin.paginationAriaLabel}
          />
        </>
      ) : (
        <Card className={styles.noProducts}>{dict.admin.noProducts}</Card>
      )}
    </div>
  );
}
