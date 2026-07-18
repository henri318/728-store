'use client';

import { ProductFormView } from './product-form-view';
import type { ProductFormProps } from './product-form-types';
import { useProductForm } from './use-product-form';

export function ProductForm({
  locale,
  mode,
  productId,
  initialValues,
  labels,
  categories = [],
}: ProductFormProps) {
  const controller = useProductForm({
    locale,
    mode,
    productId,
    initialValues,
    labels,
    categories,
  });

  return (
    <ProductFormView
      locale={locale}
      labels={labels}
      categories={categories}
      controller={controller}
    />
  );
}
