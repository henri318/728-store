import {
  ProductAudience,
  ProductRepository,
} from '../domain/product-repository';
import { resolveDisplay } from '../domain/entities/product-translation';
import { NotFoundError } from '@/shared/kernel/app-error';

export class GetProductByIdUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string, locale: string, audience?: ProductAudience) {
    const product = await this.productRepository.findById(id, locale, audience);

    if (!product) {
      throw new NotFoundError('Product not found');
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
