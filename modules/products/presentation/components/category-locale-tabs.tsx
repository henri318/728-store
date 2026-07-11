'use client';

import { ProductLocaleTabs, type ProductLocale } from './product-locale-tabs';

export type CategoryLocale = ProductLocale;

export function CategoryLocaleTabs(props: {
  value: CategoryLocale;
  onChange: (locale: CategoryLocale) => void;
  labels: { es: string; cat: string };
}) {
  return <ProductLocaleTabs {...props} />;
}
