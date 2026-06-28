import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import type { ProductEntity } from './entities/product';

export type { ProductEntity } from './entities/product';
export type { ProductTranslationEntity } from './entities/product-translation';
export type { ProductImageEntity } from './entities/product-image';
export type { TagEntity } from './entities/tag';
export type { CategoryEntity } from './entities/category';

export interface ProductsListFilter {
  q?: string;
  category?: string;
  tags?: string[];
  lang?: string;
  sortBy?: 'createdAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  sellerId?: string;
}

export interface ProductRepository {
  findAll(locale: string): Promise<ProductEntity[]>;
  findById(id: string, locale: string): Promise<ProductEntity | null>;
  findBySellerId(sellerId: string, locale: string): Promise<ProductEntity[]>;
  findPaginated(
    filter: ProductsListFilter,
  ): Promise<PaginatedResult<ProductEntity>>;
  save(entity: ProductEntity): Promise<void>;
  update(entity: ProductEntity): Promise<boolean>;
}
