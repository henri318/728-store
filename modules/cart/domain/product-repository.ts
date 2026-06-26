import type { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import type { ProductSnapshot } from './product-snapshot';

/**
 * ProductRepository — cart's port for product lookups.
 *
 * Same shape as the orders module port. Each module owns its own interface
 * so the two never have to share a definition.
 *
 * `findByIds` returns a Map keyed by product id (string) so callers can
 * detect missing products explicitly (the previous flat-array shape silently
 * dropped them and forced callers to track ordering by themselves). The key
 * is the string form of the ProductId so callers can do `map.get(id.value)`.
 */
export interface ProductRepository {
  findById(id: ProductId, locale?: string): Promise<ProductSnapshot | null>;
  findByIds(
    ids: ProductId[],
    locale?: string,
  ): Promise<Map<string, ProductSnapshot>>;
}
