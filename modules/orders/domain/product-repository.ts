import type { ProductSnapshot } from './product-snapshot';

export type { ProductSnapshot };

/**
 * ProductRepository — orders' view of the product catalog.
 *
 * This is a PORT in the orders domain. Orders depend on this port,
 * never on the products module directly.
 */
export interface ProductRepository {
  findById(id: string, locale?: string): Promise<ProductSnapshot | null>;
  findByIds(ids: string[], locale?: string): Promise<ProductSnapshot[]>;
}
