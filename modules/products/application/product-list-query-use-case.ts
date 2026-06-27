import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type {
  ProductEntity,
  ProductsListFilter,
  ProductRepository,
} from '../domain/product-repository';

export class ProductListQueryUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(
    filter: ProductsListFilter,
  ): Promise<PaginatedResult<ProductEntity>> {
    return this.productRepository.findPaginated({
      q: filter.q,
      category: filter.category,
      tags: filter.tags,
      lang: filter.lang ?? 'es',
      sortBy: filter.sortBy ?? (PaginationDefaults.sortBy as 'createdAt'),
      sortDir: filter.sortDir ?? PaginationDefaults.sortDir,
      page: filter.page ?? PaginationDefaults.page,
      pageSize: filter.pageSize ?? PaginationDefaults.pageSize,
      sellerId: filter.sellerId,
    });
  }
}
