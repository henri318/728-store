import type { ProductRepository as ProductsModuleRepository } from '@/modules/products/domain/product-repository';
import type { ProductRepository } from '../domain/product-repository';
import type { ProductSnapshot } from '../domain/product-snapshot';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

/**
 * Adapter — bridges cart's ProductRepository port to the real products
 * infrastructure. The ONLY place in the cart module that touches the
 * products module.
 *
 * The cart port uses strongly-typed value objects (ProductId, SellerId);
 * the products module's repository returns plain-string ids. The adapter
 * does the wrapping so the cart application layer never sees a raw string
 * where a typed id is expected.
 *
 * The products repository is injected via constructor so the adapter
 * stays testable and free of infrastructure imports.
 */
export class CartProductRepositoryAdapter implements ProductRepository {
  constructor(private readonly delegate: ProductsModuleRepository) {}

  async findById(
    id: ProductId,
    locale?: string,
  ): Promise<ProductSnapshot | null> {
    const product = await this.delegate.findById(id.value, locale ?? 'es');
    if (!product) return null;
    return {
      id: ProductId.create(product.id),
      basePrice: product.basePrice.amount,
      currency: product.basePrice.currency,
      sellerId: SellerId.create(product.sellerId),
    };
  }

  async findByIds(
    ids: ProductId[],
    locale?: string,
  ): Promise<Map<string, ProductSnapshot>> {
    const products = await this.delegate.findAll(locale ?? 'es');
    const wanted = new Set(ids.map((i) => i.value));
    const map = new Map<string, ProductSnapshot>();
    for (const p of products) {
      if (wanted.has(p.id)) {
        map.set(p.id, {
          id: ProductId.create(p.id),
          basePrice: p.basePrice.amount,
          currency: p.basePrice.currency,
          sellerId: SellerId.create(p.sellerId),
        });
      }
    }
    return map;
  }
}
