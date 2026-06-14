import type { ProductSnapshot } from './product-snapshot';

/**
 * ProductRepository — orders' view of the product catalog.
 *
 * This is a PORT in the orders domain. The adapter that fulfils it lives
 * in `orders/infrastructure/product-repository-adapter.ts` and delegates
 * to the real products infrastructure.
 *
 * Orders depend on this port, never on the products module directly. This
 * keeps the modules decoupled: changes to the product data model do not
 * ripple into orders, and orders can be tested with any in-memory stub
 * that fulfils this interface.
 */
export interface ProductRepository {
  findById(id: string, locale?: string): Promise<ProductSnapshot | null>;
  findByIds(ids: string[], locale?: string): Promise<ProductSnapshot[]>;
}
