import { StatusBadge } from '@/shared/ui/status-badge';
import type { DataTableColumn } from '@/shared/ui/data-table';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { ProductActions } from '@/modules/products/presentation/components/product-actions';
import {
  resolveStatusLabel,
  PRODUCT_STATUS_LABELS,
} from '@/shared/presentation/status-labels';
import type { AdminDictionary } from '@/shared/i18n/dictionary-context';

export function createProductTableColumns(
  locale: string,
  labels: {
    productName: string;
    untranslatedProduct: string;
    productStatus: string;
    productPrice: string;
    productUpdated: string;
    actions: string;
  },
  dict: AdminDictionary,
  styles: { nameCell?: string },
): DataTableColumn<ProductEntity>[] {
  return [
    {
      key: 'name',
      header: labels.productName,
      render: (product) => (
        <span className={styles.nameCell}>
          {product.translations.find(
            (translation) => translation.locale === locale,
          )?.name ?? labels.untranslatedProduct}
        </span>
      ),
    },
    {
      key: 'status',
      header: labels.productStatus,
      render: (product) => (
        <StatusBadge
          status={product.status}
          label={resolveStatusLabel(
            product.status,
            PRODUCT_STATUS_LABELS,
            dict,
          )}
        />
      ),
    },
    {
      key: 'price',
      header: labels.productPrice,
      render: (product) => product.basePrice.format(),
    },
    {
      key: 'updated',
      header: labels.productUpdated,
      render: (product) =>
        LocalizedDate.create(product.updatedAt, locale).toString(),
    },
    {
      key: 'actions',
      header: labels.actions,
      render: (product) => (
        <ProductActions
          locale={locale}
          productId={product.id}
          currentStatus={product.status}
        />
      ),
    },
  ];
}
