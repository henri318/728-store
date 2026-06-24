import { ProductRepository } from '../domain/product-repository';
import type { ProductEntity } from '../domain/product-repository';

export interface AdminListSellerProductsDTO {
  sellerId: string;
  locale: string;
}

/**
 * AdminListSellerProductsUseCase — retrieves all products for a given seller.
 *
 * Used by admin pages/API to display a seller's product catalog.
 * Delegates directly to ProductRepository.findBySellerId.
 */
export class AdminListSellerProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(dto: AdminListSellerProductsDTO): Promise<ProductEntity[]> {
    return this.productRepository.findBySellerId(dto.sellerId, dto.locale);
  }
}
