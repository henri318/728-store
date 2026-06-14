import { ProductRepository } from '../domain/product-repository';

export class GetProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(locale: string) {
    const products = await this.productRepository.findAll(locale);
    
    // Ensure we always have at least a fallback if translation is missing
    return products.map(product => ({
      ...product,
      displayName: product.translations[0]?.name || 'Untranslated',
      displayDescription: product.translations[0]?.description || ''
    }));
  }
}
