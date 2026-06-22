import type { PrismaClient } from '@prisma/client';
import type { SellerRepository } from '../domain/seller-repository';
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
