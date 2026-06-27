import type { PrismaClient } from '@prisma/client';
import type { PaginatedResult } from '@/shared/kernel/domain/value-objects/pagination';
import type {
  SellerRepository,
  SellersListFilter,
} from '../domain/seller-repository';
import type { SellerEntity } from '../domain/seller';
import type { SellerStatus } from '../domain/seller-status';
import { toDomain } from './prisma-seller-mapper';
import { prisma } from '@/shared/infrastructure/prisma';

/**
 * Prisma adapter for the `SellerRepository` port.
 *
 * Maps Prisma rows to domain entities via `toDomain` (see
 * `prisma-seller-mapper.ts`).
 *
 * Soft-deletion is enforced at the SQL boundary: every `find*` method
 * filters `deletedAt: null` in the where clause so a soft-deleted row
 * never reaches the application layer. `findById` uses `findFirst`
 * (not `findUnique`) because the Seller schema has no compound unique
 * on `(id, deletedAt)` and Prisma 7 rejects extra filters on
 * `findUnique` — same pattern as `findByName` and `findByUserId`.
 *
 * Every write method accepts an optional Prisma transaction client so
 * callers can compose seller writes with outbox writes atomically
 * (Transactional Outbox Pattern).
 */
export class PrismaSellerRepository implements SellerRepository {
  async save(
    seller: SellerEntity,
    tx: PrismaClient = prisma,
  ): Promise<SellerEntity> {
    const created = await tx.seller.create({
      data: {
        id: seller.sellerId.value,
        name: seller.name,
        description: seller.description,
        userId: seller.userId,
        status: seller.status,
        deletedAt: seller.deletedAt,
        createdAt: seller.createdAt,
        updatedAt: seller.updatedAt,
      },
    });
    return toDomain(created);
  }

  async findById(id: string): Promise<SellerEntity | null> {
    const row = await prisma.seller.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toDomain(row) : null;
  }

  async findByName(name: string): Promise<SellerEntity | null> {
    const row = await prisma.seller.findFirst({
      where: { name, deletedAt: null },
    });
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<SellerEntity[]> {
    const rows = await prisma.seller.findMany({
      where: { deletedAt: null },
    });
    return rows.map(toDomain);
  }

  async findAllByStatus(status: SellerStatus): Promise<SellerEntity[]> {
    const rows = await prisma.seller.findMany({
      where: { status, deletedAt: null },
    });
    return rows.map(toDomain);
  }

  async findPaginated(
    filter: SellersListFilter,
  ): Promise<PaginatedResult<SellerEntity>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortDir = filter.sortDir ?? 'desc';

    const where = this.buildWhere(filter);

    const [rows, total] = await prisma.$transaction([
      prisma.seller.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.seller.count({ where }),
    ]);

    return {
      items: rows.map(toDomain),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private buildWhere(
    filter: SellersListFilter,
  ): import('@prisma/client').Prisma.SellerWhereInput {
    const where: import('@prisma/client').Prisma.SellerWhereInput = {
      deletedAt: null,
    };

    if (filter.status !== undefined) {
      where.status = filter.status;
    }

    if (filter.q !== undefined && filter.q.trim() !== '') {
      where.OR = [
        { name: { contains: filter.q.trim(), mode: 'insensitive' } },
        { description: { contains: filter.q.trim(), mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async update(
    seller: SellerEntity,
    tx: PrismaClient = prisma,
  ): Promise<SellerEntity> {
    const updated = await tx.seller.update({
      where: { id: seller.sellerId.value },
      data: {
        name: seller.name,
        description: seller.description,
        userId: seller.userId,
        status: seller.status,
        deletedAt: seller.deletedAt,
        updatedAt: seller.updatedAt,
      },
    });
    return toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.seller.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByUserId(userId: string): Promise<SellerEntity | null> {
    const row = await prisma.seller.findFirst({
      where: { userId, deletedAt: null },
    });
    return row ? toDomain(row) : null;
  }
}
