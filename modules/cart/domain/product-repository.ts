import type { ProductSnapshot } from './product-snapshot';

/**
 * ProductRepository — cart's port for product lookups.
 *
 * Same shape as the orders module port. Each module owns its own interface
 * so the two never have to share a definition.
 */
export interface ProductRepository {
  findById(id: string, locale?: string): Promise<ProductSnapshot | null>;
  findByIds(ids: string[], locale?: string): Promise<ProductSnapshot[]>;
}
