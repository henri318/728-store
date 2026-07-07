import { container } from '@/composition-root/container';
import { NotFoundError } from '@/shared/kernel/app-error';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { ListSellerProductsUseCase } from '@/modules/sellers/application/use-cases/list-seller-products-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { SearchForm } from '@/shared/ui/search-form';
import { DataTable } from '@/shared/ui/data-table';
import { Pagination } from '@/shared/ui/pagination';
import { Card } from '@/shared/ui/card';
import { buildPageUrl } from '@/shared/presentation/build-page-url';
import { createProductTableColumns } from '@/modules/products/presentation/components/product-table-columns';
import { computePaginationState } from '@/shared/presentation/pagination-utils';
import styles from './page.module.css';

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
    pageSize: filter.pageSize ?? PaginationDefaults.pageSize,
    totalPages: 0,
  };

  let result: PaginatedResult<ProductEntity>;
  try {
    result = (await useCase.execute({
      userId: session?.id ?? '',
      q: filter.q,
      page: filter.page,
      pageSize: filter.pageSize,
      lang: filter.lang,
      sortBy: filter.sortBy,
      sortDir: filter.sortDir,
      audience: 'seller',
    })) as PaginatedResult<ProductEntity>;
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      result = fallbackResult;
    } else {
      throw error;
    }
  }

  const { hasItems: hasProducts, currentPage } = computePaginationState(result);

  const columns = createProductTableColumns(
    locale,
    dict.admin,
    dict.admin,
    styles,
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLead}>
          <h2 className={styles.title}>{dict.sellerDashboard.title}</h2>
          <div className={styles.headerActions}>
            <a
              href={`/${locale}/seller/products/new`}
              className={styles.createButton}
            >
              + {dict.sellerDashboard.createProduct}
            </a>
            <SearchForm
              placeholder={dict.sellerDashboard.searchPlaceholder}
              ariaLabel={dict.sellerDashboard.searchProducts}
              defaultValue={filter.q ?? ''}
              hiddenFields={{
                pageSize: String(
                  filter.pageSize ?? PaginationDefaults.pageSize,
                ),
              }}
            />
          </div>
        </div>
      </div>

      {hasProducts ? (
        <>
          <div className={styles.tableWrap}>
            <DataTable
              columns={columns}
              rows={result.items}
              rowKey={(p) => p.id}
            />
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={result.totalPages}
            buildPageUrl={(page) =>
              buildPageUrl(`/${locale}/seller/products`, page, {
                q: filter.q,
                pageSize: filter.pageSize,
                defaultPageSize: PaginationDefaults.pageSize,
              })
            }
            prevLabel={dict.admin.pagePrev}
            nextLabel={dict.admin.pageNext}
            ariaLabel={dict.admin.paginationAriaLabel}
          />
        </>
      ) : (
        <Card className={styles.noProducts}>
          {dict.sellerDashboard.noProducts}
        </Card>
      )}
    </div>
  );
}
