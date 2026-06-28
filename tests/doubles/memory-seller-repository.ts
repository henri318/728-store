import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import { PaginationDefaults } from '@/shared/kernel/domain/value-objects/pagination';
import type { SellerEntity } from '@/modules/sellers/domain/seller';
import type {
  SellerRepository,
  SellersListFilter,
} from '@/modules/sellers/domain/seller-repository';
import type { SellerStatus } from '@/modules/sellers/domain/seller-status';

/**
 * In-memory SellerRepository test double.
 *
 * Implements the production `SellerRepository` port but stores sellers in a
 * plain array. Test cases inspect the internal state to assert expected
 * domain behavior.
 */
export class MemorySellerRepository implements SellerRepository {
  private sellers: SellerEntity[] = [];

  /** Seed a seller directly (bypassing save). Useful for test setup. */
  seed(seller: SellerEntity): void {
    this.sellers.push(seller);
  }

  async save(seller: SellerEntity, _tx?: unknown): Promise<SellerEntity> {
    this.sellers.push(seller);
    return seller;
  }

  async findById(id: string): Promise<SellerEntity | null> {
    return (
      this.sellers.find(
        (s) => s.sellerId.value === id && s.deletedAt === null,
      ) ?? null
    );
  }

  async findByName(name: string): Promise<SellerEntity | null> {
    const lower = name.trim().toLowerCase();
    return (
      this.sellers.find(
        (s) => s.name.toLowerCase() === lower && s.deletedAt === null,
      ) ?? null
    );
  }

  async findAll(): Promise<SellerEntity[]> {
    return this.sellers.filter((s) => s.deletedAt === null);
  }

  async findAllByStatus(status: SellerStatus): Promise<SellerEntity[]> {
    return this.sellers.filter(
      (s) => s.status === status && s.deletedAt === null,
    );
  }

  async findPaginated(
    filter: SellersListFilter,
  ): Promise<PaginatedResult<SellerEntity>> {
    const page = filter.page ?? PaginationDefaults.page;
    const pageSize = filter.pageSize ?? PaginationDefaults.pageSize;
    const sortBy = filter.sortBy ?? (PaginationDefaults.sortBy as 'createdAt');
    const sortDir = filter.sortDir ?? PaginationDefaults.sortDir;

    let filtered = this.sellers.filter((s) => s.deletedAt === null);

    if (filter.status !== undefined) {
      filtered = filtered.filter((s) => s.status === filter.status);
    }

    if (filter.q !== undefined && filter.q.trim() !== '') {
      const q = filter.q.trim().toLowerCase();
      filtered = filtered.filter((s) => {
        const name = s.name.toLowerCase();
        const description = (s.description ?? '').toLowerCase();
        return name.includes(q) || description.includes(q);
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
    });

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    const totalPages = Math.ceil(total / pageSize);

    return { items, total, page, pageSize, totalPages };
  }

  async update(seller: SellerEntity, _tx?: unknown): Promise<SellerEntity> {
    const index = this.sellers.findIndex(
      (s) => s.sellerId.value === seller.sellerId.value,
    );
    if (index < 0) {
      throw new Error(`Seller with id ${seller.sellerId.value} not found`);
    }
    this.sellers[index] = seller;
    return seller;
  }

  async softDelete(id: string): Promise<void> {
    const seller = this.sellers.find((s) => s.sellerId.value === id);
    if (seller) {
      Object.assign(seller, { deletedAt: new Date() });
    }
  }

  async findByUserId(userId: string): Promise<SellerEntity | null> {
    return (
      this.sellers.find((s) => s.userId === userId && s.deletedAt === null) ??
      null
    );
  }
}
