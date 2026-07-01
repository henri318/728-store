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
import { DataTable } from '@/shared/ui/data-table';
import type { DataTableColumn } from '@/shared/ui/data-table';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Pagination } from '@/shared/ui/pagination';
import { Card } from '@/shared/ui/card';
import { ProductActions } from '@/modules/products/presentation/components/product-actions';
import { buildPageUrl } from '@/shared/presentation/build-page-url';
import {
  resolveStatusLabel,
  PRODUCT_STATUS_LABELS,
} from '@/shared/presentation/status-labels';
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

  const result = (await useCase
    .execute({
      userId: session?.id ?? '',
      q: filter.q,
      page: filter.page,
      pageSize: filter.pageSize,
      lang: filter.lang,
      sortBy: filter.sortBy,
      sortDir: filter.sortDir,
      audience: 'seller',
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

  const columns: DataTableColumn<ProductEntity>[] = [
    {
      key: 'name',
      header: dict.admin.productName,
      render: (product) => (
        <span className={styles.nameCell}>
          {product.translations.find(
            (translation) => translation.locale === locale,
          )?.name ?? dict.admin.untranslatedProduct}
        </span>
      ),
    },
    {
      key: 'status',
      header: dict.admin.productStatus,
      render: (product) => (
        <StatusBadge
          status={product.status}
          label={resolveStatusLabel(
            product.status,
            PRODUCT_STATUS_LABELS,
            dict.admin,
          )}
        />
      ),
    },
    {
      key: 'price',
      header: dict.admin.productPrice,
      render: (product) => product.basePrice.format(),
    },
    {
      key: 'updated',
      header: dict.admin.productUpdated,
      render: (product) =>
        LocalizedDate.create(product.updatedAt, locale).toString(),
    },
    {
      key: 'actions',
      header: dict.admin.actions,
      render: (product) => (
        <ProductActions productId={product.id} currentStatus={product.status} />
      ),
    },
  ];

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
            hiddenFields={{
              pageSize: String(filter.pageSize ?? PaginationDefaults.pageSize),
            }}
          />
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
