import Link from 'next/link';
import { container } from '@/composition-root/container';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';
import { GetSellerUseCase } from '@/modules/sellers/application/use-cases/get-seller-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import { ProductActions } from '@/modules/products/presentation/components/product-actions';
import { SearchForm } from '@/shared/ui/search-form';
import { DataTable } from '@/shared/ui/data-table';
import type { DataTableColumn } from '@/shared/ui/data-table';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Pagination } from '@/shared/ui/pagination';
import { Card } from '@/shared/ui/card';
import { requireAdmin } from '@/shared/authorization/require-admin';
import { buildPageUrl } from '@/shared/presentation/build-page-url';
import {
  resolveStatusLabel,
  PRODUCT_STATUS_LABELS,
} from '@/shared/presentation/status-labels';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
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

  const sellerRepository = container.getSellerRepository();
  const getSeller = new GetSellerUseCase(sellerRepository);
  const sellerName = (await getSeller.execute({ sellerId })).name;

  const productRepository = container.getProductRepository();
  const useCase = new ProductListQueryUseCase(productRepository);
  const result = await useCase.execute(filter);
  const { items: products, totalPages } = result;
  let page = result.page;

  if (totalPages > 0 && page > totalPages) {
    page = totalPages;
  }
  const hasProducts = products.length > 0;

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
