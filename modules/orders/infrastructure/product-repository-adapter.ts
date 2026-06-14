import type { ProductRepository } from '../domain/product-repository';
import type { ProductSnapshot } from '../domain/product-snapshot';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';

/**
 * Adapter — bridges orders' ProductRepository port to the real products
 * infrastructure. This is the ONLY place in orders that touches the
 * products module.
 *
 * Why the adapter exists:
 * - Orders must not import from the products module directly.
 * - Orders only need a 3-field snapshot of each product.
 * - The adapter does the trimming so orders never sees the full
 *   ProductEntity with all its translations, customizations, etc.
 *
 * Note: PrismaProductRepository only exposes `findById`. We implement
 * `findByIds` here by parallel-fetching each one — orders doesn't need
 * an optimised batch read for the typical single-product use case.
 */
export class OrderProductRepositoryAdapter implements ProductRepository {
  private delegate = new PrismaProductRepository();

  async findById(id: string, locale?: string): Promise<ProductSnapshot | null> {
    const product = await this.delegate.findById(id, locale ?? 'es');
    if (!product) return null;
    return {
      id: product.id,
      basePrice: product.basePrice,
      sellerId: product.sellerId,
    };
  }

  async findByIds(ids: string[], locale?: string): Promise<ProductSnapshot[]> {
    const products = await Promise.all(
      ids.map((id) => this.delegate.findById(id, locale ?? 'es')),
    );
    return products
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => ({
        id: p.id,
        basePrice: p.basePrice,
        sellerId: p.sellerId,
      }));
  }
}
