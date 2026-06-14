import type { ProductRepository } from '@/modules/orders/domain/product-repository';
import type { ProductSnapshot } from '@/modules/orders/domain/product-snapshot';

/**
 * In-memory implementation of the orders' ProductRepository port.
 *
 * Tests use this double to seed the small product snapshot that the orders
 * module cares about (id, basePrice, sellerId) without dragging in the full
 * ProductEntity with translations, customizations, etc.
 *
 * This is the ONLY place outside the orders module that constructs one of
 * these — production wires the real `OrderProductRepositoryAdapter`.
 */
export class MemoryOrderProductRepository implements ProductRepository {
  private products: ProductSnapshot[] = [];

  async findById(id: string, _locale?: string): Promise<ProductSnapshot | null> {
    return this.products.find((p) => p.id === id) ?? null;
  }

  async findByIds(ids: string[], _locale?: string): Promise<ProductSnapshot[]> {
    return this.products.filter((p) => ids.includes(p.id));
  }

  /** Test helper — populate the in-memory store. */
  seed(products: ProductSnapshot[]): void {
    this.products = products;
  }
}
