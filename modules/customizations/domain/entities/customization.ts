/**
 * CustomizationEntity — a first-class hexagonal module entity.
 *
 * Represents a product customization owned by a specific seller.
 * The sellerId MUST match the product's seller at creation time.
 */
export interface CustomizationEntity {
  id: string;
  sellerId: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  createdAt: Date;
}
