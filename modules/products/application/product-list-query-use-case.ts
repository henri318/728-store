import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';
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
   * records the search in the outbox and publishes it so the search-history
   * module can persist it. Guests are emitted with `userId: null`; the
   * subscriber no-ops for null users.
   */
  userId?: string | null;
}

const PUBLIC_DEFAULT_PAGE_SIZE = 10;

export class ProductListQueryUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outboxRepository?: OutboxRepository,
    private readonly eventBus?: EventBusPort,
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
    // - Persist before publishing; the outbox worker remains the retry path.
    // - Dependencies are optional for non-orchestrated read-only callers.
    // - Only emit on the first page to avoid duplicate history entries during infinite scroll.
    const page = filter.page ?? PaginationDefaults.page;
    if (
      isPublic &&
      trimmedQ.length > 0 &&
      page === 1 &&
      this.outboxRepository
    ) {
      const payload = {
        userId: filter.userId ?? null,
        term: trimmedQ,
        locale: filter.lang ?? 'es',
        occurredAt: new Date().toISOString(),
      };

      try {
        await this.outboxRepository.saveEvent(
          GlobalEvents.PRODUCT_SEARCH_EXECUTED,
          payload,
        );
        await this.eventBus?.emit(
          GlobalEvents.PRODUCT_SEARCH_EXECUTED,
          payload,
        );
      } catch {
        // Search history is best-effort and must not break product discovery.
      }
    }

    return result;
  }
}
