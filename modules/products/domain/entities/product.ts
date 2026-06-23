import type { ProductTranslationEntity } from './product-translation';
import type { ProductCustomizationEntity } from './product-customization';
import type { ProductImageEntity } from './product-image';
import type { TagEntity } from './tag';
import type { ProductStatus } from '../value-objects/product-status';

/**
 * ProductEntity — a pure data interface representing a product in the system.
 *
 * Follows the existing codebase pattern (SellerEntity): plain interface, no class.
 * Value objects are validated at use-case boundaries.
 *
 * Fields:
 *  - id: unique identifier
 *  - basePrice: numeric price (will be replaced by ProductPrice VO in PR3)
 *  - sellerId: FK to Seller
 *  - sellerName: denormalized seller display name
 *  - status: lifecycle state (DRAFT | ACTIVE | ARCHIVED)
 *  - categoryId: optional FK to Category
 *  - updatedAt: last modification timestamp
 *  - translations: i18n name/description per locale
 *  - customizations: product customization options
 *  - images: ordered image gallery
 *  - tags: product tags for classification
 */
export interface ProductEntity {
  readonly id: string;
  readonly basePrice: number;
  readonly sellerId: string;
  readonly sellerName: string;
  readonly status: ProductStatus;
  readonly categoryId: string | null;
  readonly updatedAt: Date;
  readonly translations: ProductTranslationEntity[];
  readonly customizations: ProductCustomizationEntity[];
  readonly images: ProductImageEntity[];
  readonly tags: TagEntity[];
}
