import type { ProductRepository } from '@/modules/cart/domain/product-repository';
import type { ProductSnapshot } from '@/modules/cart/domain/product-snapshot';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

/**
 * In-memory ProductRepository test double for the cart module.
 *
 * Implements the cart's `ProductRepository` port (which uses value-object
 * ids) and stores snapshots keyed by the string form of the id so tests
 * can `seed()` plain JSON data and look it up via the same shape.
 *
 * Tests inspect / mutate the `products` map directly to simulate price
 * changes between add and checkout (spec REQ-CART-014 / REQ-CART-020).
 */
export class MemoryCartProductRepository implements ProductRepository {
  /** Backing store keyed by string id (use productId.value for lookup). */
  private products: Map<string, ProductSnapshot> = new Map();

  async findById(
    id: ProductId,
    _locale?: string,
  ): Promise<ProductSnapshot | null> {
    return this.products.get(id.value) ?? null;
  }

  async findByIds(
    ids: ProductId[],
    _locale?: string,
  ): Promise<Map<string, ProductSnapshot>> {
    const map = new Map<string, ProductSnapshot>();
    for (const id of ids) {
      const snap = this.products.get(id.value);
      if (snap) map.set(id.value, snap);
    }
    return map;
  }

  /** Seed snapshots in plain-JSON form for readability in tests. */
  seed(
    products: Array<{
      id: string;
      basePrice: number;
      sellerId: string;
    }>,
  ): void {
    for (const p of products) {
      this.products.set(p.id, {
        id: ProductId.create(p.id),
        basePrice: p.basePrice,
        sellerId: SellerId.create(p.sellerId),
      });
    }
  }

  /** Test helper — directly mutate the stored basePrice. */
  setBasePrice(productId: string, basePrice: number): void {
    const existing = this.products.get(productId);
    if (!existing) {
      throw new Error(`Product ${productId} not seeded`);
    }
    this.products.set(productId, { ...existing, basePrice });
  }

  /** Test helper — clear all stored products between tests. */
  clear(): void {
    this.products.clear();
  }
}
