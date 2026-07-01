import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type {
  ProductAudience,
  ProductEntity,
  ProductsListFilter,
  ProductRepository,
} from '../domain/product-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

export interface ProductListQueryInput extends ProductsListFilter {
  /**
   * Authenticated user performing the search. `undefined` for guests.
   * Only relevant when `audience === 'public'`: when set, the use case
   * records the search in the outbox so the search-history module can
   * persist it. Guests are emitted with `userId: null`; the
   * `HandleProductSearchExecuted` subscriber no-ops for null users.
   */
  userId?: string | null;
}

const PUBLIC_DEFAULT_PAGE_SIZE = 10;

export class ProductListQueryUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outboxRepository?: OutboxRepository,
  ) {}

  async execute(
    filter: ProductListQueryInput,
  ): Promise<PaginatedResult<ProductEntity>> {
    const audience: ProductAudience = filter.audience ?? 'seller';
    const isPublic = audience === 'public';
    const trimmedQ = filter.q?.trim() ?? '';

    const result = await this.productRepository.findPaginated({
      q: filter.q,
      category: filter.category,
      tags: filter.tags,
      lang: filter.lang ?? 'es',
      sortBy: filter.sortBy ?? (PaginationDefaults.sortBy as 'createdAt'),
      sortDir: filter.sortDir ?? PaginationDefaults.sortDir,
      page: filter.page ?? PaginationDefaults.page,
      pageSize: isPublic
        ? (filter.pageSize ?? PUBLIC_DEFAULT_PAGE_SIZE)
        : (filter.pageSize ?? PaginationDefaults.pageSize),
      sellerId: filter.sellerId,
      audience,
    });

    // Emit PRODUCT_SEARCH_EXECUTED for public searches with a non-empty term.
    // - userId may be `null` for guests; the subscriber handles null gracefully.
    // - Outbox is optional so non-orchestrated callers (e.g. legacy routes)
    //   can construct the use case without it.
    // - Only emit on the first page to avoid duplicate history entries during infinite scroll.
    const page = filter.page ?? PaginationDefaults.page;
    if (isPublic && trimmedQ.length > 0 && page === 1 && this.outboxRepository) {
      try {
        await this.outboxRepository.saveEvent(
          GlobalEvents.PRODUCT_SEARCH_EXECUTED,
          {
            userId: filter.userId ?? null,
            term: trimmedQ,
            locale: filter.lang ?? 'es',
            occurredAt: new Date().toISOString(),
          },
        );
      } catch (error) {
        // Swallow outbox errors to avoid breaking the search query
      }
    }

    return result;
  }
}
