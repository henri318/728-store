import type {
  CartProductView,
  CartProductViewQuery,
} from '@/modules/products/application/get-cart-product-views-use-case';
import type { ProductRepository } from '../domain/product-repository';
import type { ProductSnapshot } from '../domain/product-snapshot';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

/**
 * Adapter — bridges cart's ProductRepository port to the real products
 * infrastructure. The ONLY place in the cart module that touches the
 * products module.
 *
 * The cart port uses strongly-typed value objects (ProductId, SellerId).
 * The Products query returns a localized plain-data view; this adapter wraps
 * its IDs so Cart application code never sees raw identifiers.
 *
 * The query is injected via constructor so localization remains owned by
 * Products and this adapter only translates the cross-module contract.
 */
export class CartProductRepositoryAdapter implements ProductRepository {
  constructor(private readonly query: CartProductViewQuery) {}

  async findById(
    id: ProductId,
    locale?: string,
  ): Promise<ProductSnapshot | null> {
    const products = await this.query.findByIds([id.value], locale ?? 'es');
    const product = products[0];
    if (!product) return null;
    return toSnapshot(product);
  }

  async findByIds(
    ids: ProductId[],
    locale: string = 'es',
  ): Promise<Map<string, ProductSnapshot>> {
    const products = await this.query.findByIds(
      ids.map((id) => id.value),
      locale,
    );
    return new Map(
      products.map((product) => [product.id, toSnapshot(product)]),
    );
  }
}

function toSnapshot(product: CartProductView): ProductSnapshot {
  return {
    id: ProductId.create(product.id),
    basePrice: product.basePrice,
    currency: product.currency,
    sellerId: SellerId.create(product.sellerId),
    displayName: product.displayName,
    sellerName: product.sellerName,
    imageUrl: product.imageUrl,
    images: product.images,
  };
}
