import { ProductRepository } from '../domain/product-repository';

export class GetProductByIdUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string, locale: string) {
    const product = await this.productRepository.findById(id, locale);

    if (!product) {
      throw new Error('Product not found');
    }

    const translation = product.translations[0] || {
      name: 'Untranslated',
      description: '',
    };

    return {
      ...product,
      displayName: translation.name,
      displayDescription: translation.description,
    };
  }
}
