import { describe, it, expect, vi } from 'vitest';
import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { SellerEntity } from '@/modules/sellers/domain/seller';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';

/**
 * Task 1.4 — SellerRepository port interface.
 *
 * Tests verify the interface contract by implementing a mock and
 * asserting all methods exist and can be called with correct signatures.
 * This is a port contract test — any adapter (Prisma, in-memory) must
 * satisfy these methods.
 */

function createMockSeller(overrides: Partial<SellerEntity> = {}): SellerEntity {
  return {
    sellerId: SellerId.create('seller-1'),
    name: 'Test Shop',
    description: null,
    userId: 'user-1',
    status: SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRepository(): SellerRepository {
  return {
    save: vi.fn().mockResolvedValue(createMockSeller()),
    findById: vi.fn().mockResolvedValue(createMockSeller()),
    findByName: vi.fn().mockResolvedValue(createMockSeller()),
    findAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(createMockSeller()),
    softDelete: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue(null),
  };
}

describe('SellerRepository — port contract', () => {
  let repo: SellerRepository;

  beforeEach(() => {
    repo = createMockRepository();
  });

  it('should have a save method that returns a SellerEntity', async () => {
    const seller = createMockSeller();
    const result = await repo.save(seller);

    expect(result).toBeDefined();
    expect(result.name).toBe('Test Shop');
    expect(repo.save).toHaveBeenCalledWith(seller);
  });

  it('should have a findById method that returns a SellerEntity or null', async () => {
    const result = await repo.findById('seller-1');

    expect(result).toBeDefined();
    expect(result!.sellerId.value).toBe('seller-1');
    expect(repo.findById).toHaveBeenCalledWith('seller-1');
  });

  it('should have a findByName method', async () => {
    const result = await repo.findByName('Test Shop');

    expect(result).toBeDefined();
    expect(result!.name).toBe('Test Shop');
  });

  it('should have a findAll method that returns an array', async () => {
    const sellers = [
      createMockSeller({ sellerId: SellerId.create('s1') }),
      createMockSeller({ sellerId: SellerId.create('s2') }),
    ];
    vi.mocked(repo.findAll).mockResolvedValue(sellers);

    const result = await repo.findAll();

    expect(result).toHaveLength(2);
    expect(result[0].sellerId.value).toBe('s1');
    expect(result[1].sellerId.value).toBe('s2');
  });

  it('should have an update method', async () => {
    const updated = createMockSeller({ name: 'Updated Shop' });
    vi.mocked(repo.update).mockResolvedValue(updated);

    const result = await repo.update(updated);

    expect(result.name).toBe('Updated Shop');
  });

  it('should have a softDelete method', async () => {
    await expect(repo.softDelete('seller-1')).resolves.toBeUndefined();
    expect(repo.softDelete).toHaveBeenCalledWith('seller-1');
  });

  it('should have a findByUserId method that returns a SellerEntity or null', async () => {
    const seller = createMockSeller({ userId: 'user-42' });
    vi.mocked(repo.findByUserId).mockResolvedValue(seller);

    const result = await repo.findByUserId('user-42');

    expect(result).toBeDefined();
    expect(result!.userId).toBe('user-42');
  });

  it('should return null from findByUserId when no seller is linked', async () => {
    const result = await repo.findByUserId('nonexistent-user');

    expect(result).toBeNull();
  });
});
