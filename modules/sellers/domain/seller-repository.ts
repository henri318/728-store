import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import type { SellerEntity } from './seller';
import type { SellerStatus } from './seller-status';

export interface SellersListFilter {
  status?: SellerStatus;
  q?: string;
  sortBy?: 'name' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * SellerRepository — the port for persisting and querying sellers.
 *
 * Production implementation: PrismaSellerRepository (in infrastructure layer).
 * Test implementation:      MemorySellerRepository (in tests/doubles).
 *
 * Following the existing codebase pattern (UserRepository, RoleRepository):
 * all methods return domain entities, never persistence models.
 * The adapter layer handles mapping between the two.
 *
 * Note: `save()` and `update()` accept full entities including generated
 * fields (sellerId, timestamps). The caller is responsible for creating
 * these values. This is consistent with the project's repository pattern.
 */
export interface SellerRepository {
  /**
   * Persist a new seller. Caller must provide all fields including generated ones.
   * Accepts an optional Prisma transaction client so writes can be composed
   * atomically with outbox writes (Transactional Outbox Pattern).
   */
  save(seller: SellerEntity, tx?: unknown): Promise<SellerEntity>;

  /** Find a seller by its unique ID. Returns null if not found. */
  findById(id: string): Promise<SellerEntity | null>;

  /** Find a seller by its unique name. Returns null if not found. */
  findByName(name: string): Promise<SellerEntity | null>;

  /** Return all non-deleted sellers. */
  findAll(): Promise<SellerEntity[]>;

  /**
   * Return all non-deleted sellers with the given status.
   * Filtering happens in the persistence layer, not in memory.
   */
  findAllByStatus(status: SellerStatus): Promise<SellerEntity[]>;

  /**
   * Return a paginated, filtered list of non-deleted sellers.
   * Supports status filtering, text search (q) across name and description,
   * sorting, and pagination.
   */
  findPaginated(
    filter: SellersListFilter,
  ): Promise<PaginatedResult<SellerEntity>>;

  /** Update an existing seller. Returns the updated entity. */
  update(seller: SellerEntity, tx?: unknown): Promise<SellerEntity>;

  /** Soft-delete a seller by setting deletedAt. */
  softDelete(id: string): Promise<void>;

  /** Find a seller linked to a specific user. Returns null if not linked. */
  findByUserId(userId: string): Promise<SellerEntity | null>;
}
