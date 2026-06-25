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

  async findBySellerId(
    sellerId: string,
    locale: string,
  ): Promise<ProductEntity[]> {
    return this.products
      .filter((p) => p.sellerId === sellerId)
      .map((p) => ({
        ...p,
        translations: p.translations.filter((t) => t.locale === locale),
      }));
  }

  async save(entity: ProductEntity): Promise<void> {
    const index = this.products.findIndex((p) => p.id === entity.id);
    if (index !== -1) {
      this.products[index] = entity;
    } else {
      this.products.push(entity);
    }
  }

  async update(entity: ProductEntity): Promise<boolean> {
    const index = this.products.findIndex((p) => p.id === entity.id);
    if (index === -1) return false;
    this.products[index] = entity;
    return true;
  }

  // Helper for testing
  seed(products: ProductEntity[]) {
    this.products = products;
  }
}
