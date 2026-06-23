/**
 * ProductImageEntity — a pure data interface representing a product image.
 *
 * Fields:
 *  - id: unique identifier
 *  - url: image URL
 *  - alt: optional alt text for accessibility
 *  - position: gallery ordering (0-based)
 *  - productId: FK to Product
 *  - createdAt: timestamp
 */
export interface ProductImageEntity {
  readonly id: string;
  readonly url: string;
  readonly alt: string | null;
  readonly position: number;
  readonly productId: string;
  readonly createdAt: Date;
}
