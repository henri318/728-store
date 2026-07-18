'use client';

import { ProductFormView } from './product-form-view';
import type { ProductFormProps } from './product-form-types';
import { useProductForm } from './use-product-form';

export function ProductForm(props: ProductFormProps) {
  const controller = useProductForm(props);

  return (
    <ProductFormView
      locale={props.locale}
      labels={props.labels}
      categories={props.categories ?? []}
      controller={controller}
    />
  );
}
