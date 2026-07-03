import type { ProductCustomizationConfig } from './value-objects/product-customization-config';

export interface ProductCapabilityPort {
  getConfig(productId: string): Promise<ProductCustomizationConfig | null>;
}
