'use client';

import {
  SimilarProductsContent,
  type SimilarProductsProps,
} from './similar-products-content';

export function SimilarProducts(props: SimilarProductsProps) {
  return <SimilarProductsContent key={props.productId} {...props} />;
}
