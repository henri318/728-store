import type { CategoryEntity } from './entities/category';

export type CategoryFilter = Record<string, never>;

export interface CategoryRepository {
  findAllSorted(filter?: CategoryFilter): Promise<CategoryEntity[]>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  save(category: CategoryEntity): Promise<CategoryEntity>;
  delete(id: string): Promise<void>;
  countProducts(id: string): Promise<number>;
}
