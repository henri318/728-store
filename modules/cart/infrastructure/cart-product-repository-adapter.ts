import type { ProductRepository as ProductsModuleRepository } from '@/modules/products/domain/product-repository';
import type { ProductRepository } from '../domain/product-repository';
import type { ProductSnapshot } from '../domain/product-snapshot';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { resolveDisplay } from '@/modules/products/domain/entities/product-translation';

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
    return toSnapshot(product, locale ?? 'es');
  }

  async findByIds(
    ids: ProductId[],
    locale: string = 'es',
  ): Promise<Map<string, ProductSnapshot>> {
    const products = await this.delegate.findByIds(
      ids.map((id) => id.value),
      locale,
    );
    return new Map(
      products.map((product) => [product.id, toSnapshot(product, locale)]),
    );
  }
}

function toSnapshot(
  product: Awaited<ReturnType<ProductsModuleRepository['findById']>> & {},
  locale: string,
): ProductSnapshot {
  const translation = resolveDisplay(product.translations, locale);
  return {
    id: ProductId.create(product.id),
    basePrice: product.basePrice.amount,
    currency: product.basePrice.currency,
    sellerId: SellerId.create(product.sellerId),
    displayName: translation?.name ?? '',
    sellerName: product.sellerName,
    imageUrl: product.images[0]?.url ?? null,
    images: product.images.map(({ alt, url }) => ({ alt, url })),
  };
}
