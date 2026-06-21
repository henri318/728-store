import {
  ProductEntity,
  ProductRepository,
} from '@/modules/products/domain/product-repository';

export class MemoryProductRepository implements ProductRepository {
  private products: ProductEntity[] = [];

  async findAll(locale: string): Promise<ProductEntity[]> {
    return this.products.map((p) => ({
      ...p,
      translations: p.translations.filter((t) => t.locale === locale),
    }));
  }

  async findById(id: string, locale: string): Promise<ProductEntity | null> {
    const product = this.products.find((p) => p.id === id);
    if (!product) return null;

    return {
      ...product,
      translations: product.translations.filter((t) => t.locale === locale),
    };
  }

  // Helper for testing
  seed(products: ProductEntity[]) {
    this.products = products;
  }
}
