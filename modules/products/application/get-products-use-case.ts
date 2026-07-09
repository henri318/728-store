import { ProductRepository } from '../domain/product-repository';
import { resolveDisplay } from '../domain/entities/product-translation';

export class GetProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(locale: string) {
    const products = await this.productRepository.findAll(locale);

    return products.map((product) => ({
      ...product,
      displayTranslation: resolveDisplay(product.translations, locale),
      displayName: resolveDisplay(product.translations, locale)?.name ?? '',
      displayDescription:
        resolveDisplay(product.translations, locale)?.description ?? '',
    }));
  }
}
