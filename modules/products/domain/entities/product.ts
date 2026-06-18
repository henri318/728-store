import type { ProductTranslationEntity } from './product-translation';
import type { ProductCustomizationEntity } from './product-customization';

export interface ProductEntity {
  id: string;
  basePrice: number;
  sellerId: string;
  sellerName: string;
  translations: ProductTranslationEntity[];
  customizations: ProductCustomizationEntity[];
}
