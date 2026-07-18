import { NotFoundError } from '@/shared/kernel/app-error';
import type {
  ProductEntity,
  ProductRepository,
} from '../domain/product-repository';
import type { SellerOwnershipLookupPort } from '../domain/seller-ownership-lookup-port';
import {
  ListCategoriesUseCase,
  type CategoryOption,
} from './list-categories-use-case';

export interface GetSellerProductFormDTO {
  userId: string;
  productId: string;
  locale: 'es' | 'cat';
}

export interface SellerProductFormData {
  product: ProductEntity;
  categories: CategoryOption[];
}

export class GetSellerProductFormUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly sellerOwnershipLookup: SellerOwnershipLookupPort,
  ) {}

  async execute(dto: GetSellerProductFormDTO): Promise<SellerProductFormData> {
    const sellerId = await this.sellerOwnershipLookup.findSellerIdByUserId(
      dto.userId,
    );
    if (!sellerId) {
      throw new NotFoundError('Seller not found');
    }

    const [product, categories] = await Promise.all([
      this.productRepository.findById(dto.productId, dto.locale, 'seller'),
      this.listCategories.executeOptions(dto.locale),
    ]);

    if (!product || product.sellerId !== sellerId) {
      throw new NotFoundError('Product not found');
    }

    return { product, categories };
  }
}
