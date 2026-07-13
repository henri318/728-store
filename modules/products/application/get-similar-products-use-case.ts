import { ProductRepository, ProductEntity } from '../domain/product-repository';
import { resolveDisplay } from '../domain/entities/product-translation';

export interface SimilarProductItem extends Omit<
  ProductEntity,
  'images' | 'translations'
> {
  displayTranslation: ReturnType<typeof resolveDisplay>;
  displayName: string;
  displayDescription: string;
  cover: ProductEntity['images'][number] | null;
  translations: ProductEntity['translations'];
}

export class GetSimilarProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(
    productId: string,
    tagNames: string[],
    locale: string,
    limit?: number,
  ): Promise<SimilarProductItem[]> {
    const products = await this.productRepository.findSimilar(
      productId,
      tagNames,
      locale,
      limit,
    );

    return products.map((product) => {
      const translation = resolveDisplay(product.translations, locale);
      const cover = product.images.find((image) => image.purpose === 'COVER');
      return {
        id: product.id,
        basePrice: product.basePrice,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        status: product.status,
        categoryId: product.categoryId,
        category: product.category,
        customizationConfig: product.customizationConfig,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        translations: product.translations,
        tags: product.tags,
        images: product.images,
        displayTranslation: translation,
        displayName: translation?.name ?? '',
        displayDescription: translation?.description ?? '',
        cover: cover ?? null,
      };
    });
  }
}
