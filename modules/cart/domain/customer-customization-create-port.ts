import type { CustomizationDesignPositionSnapshot } from './customization-lookup-port';

export interface CustomerCustomizationInput {
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
  designPosition?: CustomizationDesignPositionSnapshot | null;
}

/**
 * Cart-owned port for creating a buyer customization as part of a cart write.
 * The adapter must use the supplied transaction client for its persistence.
 */
export interface CustomerCustomizationCreatePort {
  create(
    input: CustomerCustomizationInput & { productId: string },
    userId: string,
    tx: object,
  ): Promise<{ id: string; productId: string }>;
}
