import type { ProductEntity } from './entities/product';

export type { ProductEntity } from './entities/product';
export type { ProductTranslationEntity } from './entities/product-translation';
export type { ProductCustomizationEntity } from './entities/product-customization';

export interface ProductRepository {
  findAll(locale: string): Promise<ProductEntity[]>;
  findById(id: string, locale: string): Promise<ProductEntity | null>;
}
