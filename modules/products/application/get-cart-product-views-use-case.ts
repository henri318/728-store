import type { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { ProductRepository } from '../domain/product-repository';
import { resolveDisplay } from '../domain/entities/product-translation';

export interface CartProductView {
  id: string;
  basePrice: number;
  currency: Currency;
  sellerId: string;
  displayName: string;
  sellerName: string;
  imageUrl: string | null;
  images: Array<{ alt: string | null; url: string }>;
}

export interface CartProductViewQuery {
  findByIds(ids: string[], locale: string): Promise<CartProductView[]>;
}

export class GetCartProductViewsUseCase implements CartProductViewQuery {
  constructor(private readonly productRepository: ProductRepository) {}

  async findByIds(ids: string[], locale: string): Promise<CartProductView[]> {
    const products = await this.productRepository.findByIds(ids, locale);

    return products.map((product) => {
      const translation = resolveDisplay(product.translations, locale);
      return {
        id: product.id,
        basePrice: product.basePrice.amount,
        currency: product.basePrice.currency,
        sellerId: product.sellerId,
        displayName: translation?.name ?? '',
        sellerName: product.sellerName,
        imageUrl: product.images[0]?.url ?? null,
        images: product.images.map(({ alt, url }) => ({ alt, url })),
      };
    });
  }
}
