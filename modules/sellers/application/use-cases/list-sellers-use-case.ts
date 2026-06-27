import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import type {
  SellerRepository,
  SellersListFilter,
} from '@/modules/sellers/domain/seller-repository';
import type { SellerEntity } from '@/modules/sellers/domain/seller';

export interface ListSellersDTO {
  status?: SellersListFilter['status'];
  q?: string;
  sortBy?: 'name' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export class ListSellersUseCase {
  constructor(private readonly sellerRepository: SellerRepository) {}

  async execute(dto: ListSellersDTO): Promise<PaginatedResult<SellerEntity>> {
    return this.sellerRepository.findPaginated({
      status: dto.status,
      q: dto.q,
      sortBy: dto.sortBy ?? (PaginationDefaults.sortBy as 'createdAt'),
      sortDir: dto.sortDir ?? PaginationDefaults.sortDir,
      page: dto.page ?? PaginationDefaults.page,
      pageSize: dto.pageSize ?? PaginationDefaults.pageSize,
    });
  }
}
