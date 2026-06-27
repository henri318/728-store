/**
 * CustomizationEntity — a first-class hexagonal module entity.
 *
 * Represents a product customization. Ownership is derived from the
 * associated Product (Product.sellerId). The productId MUST reference
 * a valid product at creation time.
 */
export interface CustomizationEntity {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  createdAt: Date;
}
