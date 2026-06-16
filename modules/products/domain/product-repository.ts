export interface ProductTranslationEntity {
  locale: string;
  name: string;
  description: string | null;
}

export interface ProductCustomizationEntity {
  id: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  productId: string;
  createdAt: Date;
}

export interface ProductEntity {
  id: string;
  basePrice: number;
  sellerId: string;
  sellerName: string;
  translations: ProductTranslationEntity[];
  customizations: ProductCustomizationEntity[];
}

export interface ProductRepository {
  findAll(locale: string): Promise<ProductEntity[]>;
  findById(id: string, locale: string): Promise<ProductEntity | null>;
}
