/**
 * CustomizationEntity — a first-class hexagonal module entity.
 *
 * Represents a product customization. Ownership is derived from the
 * associated Product (Product.sellerId). The productId MUST reference
 * a valid product at creation time.
 *
 * `designPosition` carries the buyer-side design position captured by the
 * mockup canvas (x/y/scale/rotation_deg/opacity/blend_mode/imageUrl).
 * Persisted as JSONB; kept loosely typed at the entity level so the
 * customizations module does not depend on the products module's VO.
 */
export interface CustomizationEntity {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  imageUploadId?: string | null;
  designPosition: DesignPositionValue | null;
  createdAt: Date;
}

/**
 * Minimal shape we keep on the customization. Mirrors the JSON payload
 * produced by the mockup canvas. Validated upstream by the zod schema
 * in the presentation layer; here we trust the persisted shape.
 */
export interface DesignPositionValue {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: string;
}
