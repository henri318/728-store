import type { ProductEntity } from '../domain/product-repository';
import type { ProductCustomizationConfigJson } from '../domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '../domain/value-objects/product-image-purpose';

interface SerializeProductOptions {
  publicView?: boolean;
  listingView?: boolean;
}

export interface SerializedProductListingImage {
  url: string;
  alt: string | null;
}

export interface SerializedProductDetail extends Omit<
  ProductEntity,
  'images' | 'customizationConfig' | 'basePrice' | 'createdAt' | 'updatedAt'
> {
  images: ProductEntity['images'];
  cover: ProductEntity['images'][number] | null;
  showcase: ProductEntity['images'];
  customizableBase: ProductEntity['images'];
  customizationConfig: ProductCustomizationConfigJson | null;
  basePrice: {
    amount: number;
    currency: string;
  };
}

export interface SerializedProductListing {
  id: string;
  basePrice: {
    amount: number;
    currency: string;
  };
  sellerId: string;
  sellerName: string;
  status: ProductEntity['status'];
  categoryId: string | null;
  category: ProductEntity['category'];
  customizationConfig: ProductCustomizationConfigJson | null;
  createdAt: string;
  updatedAt: string;
  translations: ProductEntity['translations'];
  cover: SerializedProductListingImage | null;
  tags: ProductEntity['tags'];
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

function splitImages(product: ProductEntity) {
  const cover =
    product.images.find(
      (image) => image.purpose === ProductImagePurpose.COVER,
    ) ?? null;

  return {
    cover,
    showcase: product.images.filter(
      (image) => image.purpose === ProductImagePurpose.SHOWCASE,
    ),
    customizableBase: product.images.filter(
      (image) => image.purpose === ProductImagePurpose.CUSTOMIZABLE_BASE,
    ),
  };
}

export function serializeProduct(
  product: ProductEntity,
  options: SerializeProductOptions & { listingView: true },
): SerializedProductListing;
export function serializeProduct(
  product: ProductEntity,
  options?: SerializeProductOptions,
): SerializedProductDetail;
export function serializeProduct(
  product: ProductEntity,
  options: SerializeProductOptions = {},
): SerializedProductListing | SerializedProductDetail {
  const isPublicView = options.publicView ?? false;
  const split = splitImages(product);

  if (options.listingView) {
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
      cover: split.cover
        ? {
            url: split.cover.url,
            alt: split.cover.alt,
          }
        : null,
      tags: product.tags,
    };
  }

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
    cover: split.cover,
    showcase: split.showcase,
    customizableBase: split.customizableBase,
    images: product.images,
    tags: product.tags,
  };
}
