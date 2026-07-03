import type { ProductEntity } from '../domain/product-repository';

export function serializeProduct(product: ProductEntity) {
  return {
    id: product.id,
    basePrice: {
      amount: product.basePrice.amount,
      currency: product.basePrice.currency,
    },
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    status: product.status,
    categoryId: product.categoryId,
    category: product.category,
    customizationConfig: product.customizationConfig?.toJson() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    translations: product.translations,
    images: product.images,
    tags: product.tags,
  };
}
