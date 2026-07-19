/**
 * CustomizationLookupPort — cart's port for customization lookups.
 *
 * The cart module never imports from the customizations module directly.
 * This port is the single seam: the composition root wires an adapter
 * that bridges to the real customizations infrastructure at runtime.
 *
 * Returns lightweight snapshots (no domain VOs) so the cart module
 * stays decoupled from the customizations module's internal types.
 */
export interface CustomizationLookupPort {
  /**
   * Returns the customizations that exist for the given IDs.
   * Missing IDs are silently absent from the result (same contract
   * as the customizations module's repository.findByIds).
   */
  findByIds(ids: string[]): Promise<CustomizationSnapshot[]>;

  /**
   * Returns the customizations that belong to a product.
   * Used by guest-cart migration to resolve guest-side customization fields
   * back to stable customization IDs before cart items are merged.
   */
  findByProductId(productId: string): Promise<CustomizationSnapshot[]>;
}

/**
 * CustomizationSnapshot — read-only view of a customization.
 *
 * Carries the minimum fields the cart needs for validation and
 * checkout presentation. No value objects — plain primitives so
 * the cart module never depends on the customizations module's
 * internal types.
 *
 * `designPosition` is included so the cart/order layers can persist
 * the buyer-side design placement alongside the rest of the snapshot.
 */
export interface CustomizationSnapshot {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  imageUploadId?: string | null;
  designPosition: CustomizationDesignPositionSnapshot | null;
}

/**
 * Lightweight design position shape — the cart module does not depend
 * on the products module's `DesignPosition` VO. The shape is stable
 * and validated upstream by the customizations module.
 */
export interface CustomizationDesignPositionSnapshot {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: string;
}
