import type { ProductEntity } from './entities/product';

export type { ProductEntity } from './entities/product';
export type { ProductTranslationEntity } from './entities/product-translation';
export type { ProductCustomizationEntity } from './entities/product-customization';
export type { ProductImageEntity } from './entities/product-image';
export type { TagEntity } from './entities/tag';
export type { CategoryEntity } from './entities/category';

export interface ProductRepository {
  findAll(locale: string): Promise<ProductEntity[]>;
  findById(id: string, locale: string): Promise<ProductEntity | null>;
  save(entity: ProductEntity): Promise<void>;
  update(entity: ProductEntity): Promise<boolean>;
}
