import { describe, it, expect } from 'vitest';
import {
  toDomain,
  toPersistence,
} from '@/modules/sellers/infrastructure/prisma-seller-mapper';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import type { SellerEntity } from '@/modules/sellers/domain/seller';

/**
 * Task 3.1 — prisma-seller-mapper pure functions.
 *
 * `toDomain` converts a Prisma `Seller` row into a domain `SellerEntity`.
 * `toPersistence` converts a domain `SellerEntity` into a Prisma create input.
 *
 * Both functions are PURE — they have no side effects, no I/O, no Prisma
 * client dependency. That's why we can test them directly without mocks.
 */
describe('prisma-seller-mapper.toDomain', () => {
  it('should map a Prisma Seller row to a SellerEntity with all fields', () => {
    const created = new Date('2025-01-01T10:00:00Z');
    const updated = new Date('2025-01-02T10:00:00Z');

    const prismaSeller = {
      id: 'seller-1',
      name: 'Test Shop',
      description: 'A test shop',
      userId: 'user-1',
      status: 'active',
      deletedAt: null,
      createdAt: created,
      updatedAt: updated,
    };

    const result = toDomain(prismaSeller);

    expect(result.sellerId).toBeInstanceOf(SellerId);
    expect(result.sellerId.value).toBe('seller-1');
    expect(result.name).toBe('Test Shop');
    expect(result.description).toBe('A test shop');
    expect(result.userId).toBe('user-1');
    expect(result.status).toBe(SellerStatus.ACTIVE);
    expect(result.deletedAt).toBeNull();
    expect(result.createdAt).toBe(created);
    expect(result.updatedAt).toBe(updated);
  });

  it('should map a null description to null', () => {
    const prismaSeller = {
      id: 'seller-2',
      name: 'Minimal Shop',
      description: null,
      userId: 'user-2',
      status: 'active',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = toDomain(prismaSeller);

    expect(result.description).toBeNull();
  });

  it('should map SUSPENDED status string to SellerStatus.SUSPENDED', () => {
    const prismaSeller = {
      id: 'seller-3',
      name: 'Suspended Shop',
      description: null,
      userId: 'user-3',
      status: 'suspended',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = toDomain(prismaSeller);

    expect(result.status).toBe(SellerStatus.SUSPENDED);
  });

  it('should map BANNED status string to SellerStatus.BANNED', () => {
    const prismaSeller = {
      id: 'seller-4',
      name: 'Banned Shop',
      description: null,
      userId: 'user-4',
      status: 'banned',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = toDomain(prismaSeller);

    expect(result.status).toBe(SellerStatus.BANNED);
  });

  it('should map a deletedAt Date when present', () => {
    const deletedAt = new Date('2025-06-15T12:00:00Z');
    const prismaSeller = {
      id: 'seller-5',
      name: 'Deleted Shop',
      description: null,
      userId: 'user-5',
      status: 'banned',
      deletedAt,
      createdAt: new Date('2025-01-01'),
      updatedAt: deletedAt,
    };

    const result = toDomain(prismaSeller);

    expect(result.deletedAt).toBe(deletedAt);
  });
});

describe('prisma-seller-mapper.toPersistence', () => {
  function makeEntity(overrides: Partial<SellerEntity> = {}): SellerEntity {
    return {
      sellerId: SellerId.create('seller-1'),
      name: 'Test Shop',
      description: 'A test shop',
      userId: 'user-1',
      status: SellerStatus.ACTIVE,
      deletedAt: null,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
      ...overrides,
    };
  }

  it('should map a SellerEntity to a Prisma create input', () => {
    const entity = makeEntity();

    const result = toPersistence(entity);

    expect(result.id).toBe('seller-1');
    expect(result.name).toBe('Test Shop');
    expect(result.description).toBe('A test shop');
    expect(result.userId).toBe('user-1');
    expect(result.status).toBe('active');
    expect(result.deletedAt).toBeNull();
    expect(result.createdAt).toEqual(new Date('2025-01-01T10:00:00Z'));
    expect(result.updatedAt).toEqual(new Date('2025-01-02T10:00:00Z'));
  });

  it('should preserve null description', () => {
    const entity = makeEntity({ description: null });

    const result = toPersistence(entity);

    expect(result.description).toBeNull();
  });

  it('should map SellerStatus.SUSPENDED to the "suspended" string', () => {
    const entity = makeEntity({ status: SellerStatus.SUSPENDED });

    const result = toPersistence(entity);

    expect(result.status).toBe('suspended');
  });

  it('should map SellerStatus.BANNED to the "banned" string', () => {
    const entity = makeEntity({ status: SellerStatus.BANNED });

    const result = toPersistence(entity);

    expect(result.status).toBe('banned');
  });

  it('should map a deletedAt Date when present', () => {
    const deletedAt = new Date('2025-06-15T12:00:00Z');
    const entity = makeEntity({ deletedAt });

    const result = toPersistence(entity);

    expect(result.deletedAt).toEqual(deletedAt);
  });
});

describe('prisma-seller-mapper — round trip', () => {
  it('toDomain then toPersistence should preserve the entity', () => {
    const original = {
      id: 'seller-rt',
      name: 'Round Trip Shop',
      description: 'rt desc',
      userId: 'user-rt',
      status: 'active' as const,
      deletedAt: null,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
    };

    const domain = toDomain(original);
    const back = toPersistence(domain);

    expect(back).toEqual(original);
  });
});
