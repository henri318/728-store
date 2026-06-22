import type { SellerEntity } from '../domain/seller';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '../domain/seller-status';

/**
 * Shape of a Prisma `Seller` row as returned from the database.
 *
 * Kept as a structural type (no Prisma import) so the mapper stays
 * decoupled from the Prisma client and can be unit-tested without
 * any database dependency.
 *
 * Note: `userId` is typed as `string | null` to match the Prisma
 * generated type. The domain entity requires a non-null `userId`
 * (every seller must be linked to a user), so `toDomain` throws if
 * the column is null.
 */
export interface PrismaSellerRow {
  id: string;
  name: string;
  description: string | null;
  userId: string | null;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape of a Prisma `Seller` create input. */
export interface PrismaSellerCreateInput {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert a Prisma `Seller` row to a domain `SellerEntity`.
 *
 * Pure function — no I/O, no Prisma client access. Safe to call in
 * unit tests without a database connection.
 */
export function toDomain(prismaSeller: PrismaSellerRow): SellerEntity {
  if (prismaSeller.userId === null) {
    throw new Error('Seller.userId is required (orphan seller row)');
  }
  return {
    sellerId: SellerId.create(prismaSeller.id),
    name: prismaSeller.name,
    description: prismaSeller.description,
    userId: prismaSeller.userId,
    status: prismaSeller.status as SellerStatus,
    deletedAt: prismaSeller.deletedAt,
    createdAt: prismaSeller.createdAt,
    updatedAt: prismaSeller.updatedAt,
  };
}

/**
 * Convert a domain `SellerEntity` to a Prisma create input.
 *
 * Pure function — produces a plain object suitable for
 * `prisma.seller.create({ data: ... })`. Caller is responsible for
 * passing it to the Prisma client.
 */
export function toPersistence(seller: SellerEntity): PrismaSellerCreateInput {
  return {
    id: seller.sellerId.value,
    name: seller.name,
    description: seller.description,
    userId: seller.userId,
    status: seller.status,
    deletedAt: seller.deletedAt,
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
  };
}
