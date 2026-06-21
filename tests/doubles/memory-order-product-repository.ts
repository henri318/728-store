import type { ProductRepository } from '@/modules/orders/domain/product-repository';
import type { ProductSnapshot } from '@/modules/orders/domain/product-snapshot';

/**
 * In-memory ProductRepository test double for orders module.
 */
export class MemoryOrderProductRepository implements ProductRepository {
  private products = new Map<string, ProductSnapshot>();

  async findById(
    id: string,
    _locale?: string,
  ): Promise<ProductSnapshot | null> {
    return this.products.get(id) ?? null;
  }

  async findByIds(ids: string[], _locale?: string): Promise<ProductSnapshot[]> {
    return ids
      .map((id) => this.products.get(id))
      .filter((p): p is ProductSnapshot => p != null);
  }

  seed(products: ProductSnapshot[]): void {
    for (const p of products) {
      this.products.set(p.id, p);
    }
  }
}
