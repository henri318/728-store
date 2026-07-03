/**
 * CustomizationLookupPort — orders' port for customization lookups.
 *
 * The orders module never imports from the customizations module directly.
 * This port is the single seam: the composition root wires an adapter
 * that bridges to the real customizations infrastructure at runtime.
 *
 * Returns lightweight snapshots (no domain VOs) so orders stay decoupled
 * from the customizations module's internal types.
 */
export interface CustomizationLookupPort {
  /**
   * Returns the customizations that exist for the given IDs.
   * Missing IDs are silently absent from the result.
   */
  findByIds(ids: string[]): Promise<CustomizationLookupSnapshot[]>;
}

/**
 * CustomizationLookupSnapshot — read-only view returned by the lookup port.
 */
export interface CustomizationLookupSnapshot {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  designPosition: CustomizationDesignPositionSnapshot | null;
}

/**
 * CustomizationSnapshot — frozen payload stored on an order line item.
 */
export interface CustomizationSnapshot {
  id: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  designPosition: CustomizationDesignPositionSnapshot | null;
}

/**
 * Lightweight design position shape — kept as primitives so the orders
 * module never depends on the products module's `DesignPosition` VO.
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
