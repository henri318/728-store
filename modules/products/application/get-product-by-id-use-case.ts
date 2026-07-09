import { ProductRepository } from '../domain/product-repository';
import { resolveDisplay } from '../domain/entities/product-translation';

export class GetProductByIdUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string, locale: string) {
    const product = await this.productRepository.findById(id, locale);

    if (!product) {
      throw new Error('Product not found');
    }

    const translation = resolveDisplay(product.translations, locale);

    return {
      ...product,
      displayTranslation: translation,
      displayName: translation?.name ?? '',
      displayDescription: translation?.description ?? '',
    };
  }
}
