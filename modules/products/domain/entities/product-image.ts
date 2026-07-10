/**
 * ProductImageEntity — a pure data interface representing a product image.
 *
 * Fields:
 *  - id: unique identifier
 *  - url: image URL
 *  - alt: optional alt text for accessibility
 *  - position: gallery ordering (0-based)
 *  - purpose: explicit media bucket
 *  - mimeType: persisted uploaded MIME type
 *  - posterUrl: optional poster for showcase videos
 *  - productId: FK to Product
 *  - createdAt: timestamp
 */
import type { ProductImagePurpose } from '../value-objects/product-image-purpose';

export interface ProductImageEntity {
  readonly id: string;
  readonly url: string;
  readonly alt: string | null;
  readonly position: number;
  readonly purpose: ProductImagePurpose;
  readonly mimeType: string;
  readonly posterUrl: string | null;
  readonly productId: string;
  readonly createdAt: Date;
}
