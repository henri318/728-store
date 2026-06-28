import type { ProductTranslationEntity } from './product-translation';
import type { ProductCustomizationEntity } from './product-customization';
import type { ProductImageEntity } from './product-image';
import type { TagEntity } from './tag';
import type { CategoryEntity } from './category';
import type { ProductStatus } from '../value-objects/product-status';
import type { ProductPrice } from '../value-objects/product-price';

export interface ProductEntity {
  readonly id: string;
  readonly basePrice: ProductPrice;
  readonly sellerId: string;
  readonly sellerName: string;
  readonly status: ProductStatus;
  readonly categoryId: string | null;
  readonly category: CategoryEntity | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly translations: ProductTranslationEntity[];
  readonly customizations: ProductCustomizationEntity[];
  readonly images: ProductImageEntity[];
  readonly tags: TagEntity[];
}
