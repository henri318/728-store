import { NotFoundError } from '@/shared/kernel/app-error';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';

export interface ListSellerProductsDTO {
  userId: string;
  q?: string;
  page?: number;
  pageSize?: number;
  lang?: string;
  sortBy?: 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export interface ProductQuery {
  execute(filter: {
    q?: string;
    page?: number;
    pageSize?: number;
    lang?: string;
    sortBy?: 'createdAt';
    sortDir?: 'asc' | 'desc';
    sellerId: string;
  }): Promise<PaginatedResult<unknown>>;
}

export class ListSellerProductsUseCase {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly productQuery: ProductQuery,
  ) {}

  async execute(dto: ListSellerProductsDTO): Promise<PaginatedResult<unknown>> {
    const seller = await this.sellerRepository.findByUserId(dto.userId);

    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    const { userId: _userId, ...filter } = dto;

    return this.productQuery.execute({
      ...filter,
      sellerId: seller.sellerId.value,
    });
  }
}
