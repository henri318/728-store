import type { ProductTranslationEntity } from './product-translation';
import type { ProductImageEntity } from './product-image';
import type { TagEntity } from './tag';
import type { CategoryEntity } from './category';
import type { ProductStatus } from '../value-objects/product-status';
import type { ProductPrice } from '../value-objects/product-price';
import type { ProductCustomizationConfig } from '../value-objects/product-customization-config';
import { resolveDisplay as resolveTranslationDisplay } from './product-translation';

export interface ProductEntity {
  readonly id: string;
  readonly basePrice: ProductPrice;
  readonly sellerId: string;
  readonly sellerName: string;
  readonly status: ProductStatus;
  readonly categoryId: string | null;
  readonly category: CategoryEntity | null;
  readonly customizationConfig?: ProductCustomizationConfig;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly translations: ProductTranslationEntity[];
  readonly images: ProductImageEntity[];
  readonly tags: TagEntity[];
}

export function hasDefaultLocaleTranslation(product: ProductEntity): boolean {
  return product.translations.some(
    (translation) =>
      translation.locale === 'es' && translation.name.trim().length > 0,
  );
}

export function resolveDisplay(
  product: ProductEntity,
  locale: string,
): ProductTranslationEntity | null {
  return resolveTranslationDisplay(product.translations, locale);
}
