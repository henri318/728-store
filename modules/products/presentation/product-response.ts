import type { ProductEntity } from '../domain/product-repository';

interface SerializeProductOptions {
  publicView?: boolean;
}

function serializeTranslation(
  translation: ProductEntity['translations'][number],
  isPublicView: boolean,
) {
  const serialized = { ...translation };

  if (isPublicView) {
    delete serialized.designChangeDescription;
  }

  return serialized;
}

export function serializeProduct(
  product: ProductEntity,
  options: SerializeProductOptions = {},
) {
  const isPublicView = options.publicView ?? false;

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
    translations: product.translations.map((translation) =>
      serializeTranslation(translation, isPublicView),
    ),
    images: product.images,
    tags: product.tags,
  };
}
