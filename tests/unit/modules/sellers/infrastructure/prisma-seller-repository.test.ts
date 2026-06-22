import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the mock setup so vi.mock's hoisted factory can access it.
// Mirrors the pattern used in `transactional-order-service.test.ts`.
const mocks = vi.hoisted(() => {
  const txMock = {
    seller: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };

  const prismaMock = {
    seller: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(
      async (callback: (tx: typeof txMock) => Promise<void>) =>
        callback(txMock),
    ),
  };

  return { txMock, prismaMock };
});

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: mocks.prismaMock,
}));

// Import after the mock is registered
import { PrismaSellerRepository } from '@/modules/sellers/infrastructure/prisma-seller-repository';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import type { SellerEntity } from '@/modules/sellers/domain/seller';

function makeEntity(overrides: Partial<SellerEntity> = {}): SellerEntity {
  return {
    sellerId: SellerId.create('seller-1'),
    name: 'Test Shop',
    description: 'A test shop',
    userId: 'user-1',
    status: SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makePrismaRow(
  overrides: Partial<{
    id: string;
    name: string;
    description: string | null;
    userId: string;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: 'seller-1',
    name: 'Test Shop',
    description: 'A test shop',
    userId: 'user-1',
    status: 'active',
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('PrismaSellerRepository', () => {
  let repo: PrismaSellerRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PrismaSellerRepository();
  });

  describe('save', () => {
    it('should call prisma.seller.create with mapped persistence data', async () => {
      const entity = makeEntity();
      mocks.prismaMock.seller.create.mockResolvedValue(makePrismaRow());

      await repo.save(entity);

      expect(mocks.prismaMock.seller.create).toHaveBeenCalledWith({
        data: {
          id: 'seller-1',
          name: 'Test Shop',
          description: 'A test shop',
          userId: 'user-1',
          status: 'active',
          deletedAt: null,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        },
      });
    });

    it('should return a domain entity with SellerId VO', async () => {
      const entity = makeEntity();
      mocks.prismaMock.seller.create.mockResolvedValue(makePrismaRow());

      const result = await repo.save(entity);

      expect(result.sellerId).toBeInstanceOf(SellerId);
      expect(result.sellerId.value).toBe('seller-1');
      expect(result.status).toBe(SellerStatus.ACTIVE);
    });
  });

  describe('findById', () => {
    it('should call prisma.seller.findFirst with id and exclude soft-deleted', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(null);

      await repo.findById('seller-1');

      // Soft-deletion is enforced at the SQL boundary: the where clause
      // MUST include `deletedAt: null` so a soft-deleted row never reaches
      // the application layer. Uses `findFirst` (not `findUnique`) because
      // the Seller schema has no compound unique on (id, deletedAt) and
      // Prisma 7 rejects extra filters on `findUnique` — same pattern as
      // `findByName` and `findByUserId`.
      expect(mocks.prismaMock.seller.findFirst).toHaveBeenCalledWith({
        where: { id: 'seller-1', deletedAt: null },
      });
    });

    it('should return null when seller not found', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(null);

      const result = await repo.findById('missing');

      expect(result).toBeNull();
    });

    it('should return a domain entity when found', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(
        makePrismaRow({ name: 'Found Shop' }),
      );

      const result = await repo.findById('seller-1');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Found Shop');
      expect(result!.sellerId.value).toBe('seller-1');
    });
  });

  describe('findByName', () => {
    it('should query by name and exclude soft-deleted', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(null);

      await repo.findByName('Test Shop');

      expect(mocks.prismaMock.seller.findFirst).toHaveBeenCalledWith({
        where: { name: 'Test Shop', deletedAt: null },
      });
    });

    it('should return null when no match', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(null);

      const result = await repo.findByName('Missing');

      expect(result).toBeNull();
    });

    it('should return a domain entity when found', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(
        makePrismaRow({ name: 'Found Shop' }),
      );

      const result = await repo.findByName('Found Shop');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Found Shop');
    });
  });

  describe('findAll', () => {
    it('should query and exclude soft-deleted sellers', async () => {
      mocks.prismaMock.seller.findMany.mockResolvedValue([makePrismaRow()]);

      await repo.findAll();

      expect(mocks.prismaMock.seller.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should map every row to a domain entity', async () => {
      mocks.prismaMock.seller.findMany.mockResolvedValue([
        makePrismaRow({ id: 's1', name: 'Shop 1' }),
        makePrismaRow({ id: 's2', name: 'Shop 2' }),
      ]);

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].sellerId.value).toBe('s1');
      expect(result[1].sellerId.value).toBe('s2');
    });

    it('should return empty array when no sellers', async () => {
      mocks.prismaMock.seller.findMany.mockResolvedValue([]);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findAllByStatus', () => {
    it('should query by status and exclude soft-deleted sellers', async () => {
      mocks.prismaMock.seller.findMany.mockResolvedValue([
        makePrismaRow({ status: 'active' }),
      ]);

      await repo.findAllByStatus(SellerStatus.ACTIVE);

      expect(mocks.prismaMock.seller.findMany).toHaveBeenCalledWith({
        where: { status: 'active', deletedAt: null },
      });
    });

    it('should return mapped domain entities', async () => {
      mocks.prismaMock.seller.findMany.mockResolvedValue([
        makePrismaRow({ id: 's1', name: 'Active Shop', status: 'active' }),
      ]);

      const result = await repo.findAllByStatus(SellerStatus.ACTIVE);

      expect(result).toHaveLength(1);
      expect(result[0].sellerId.value).toBe('s1');
      expect(result[0].status).toBe(SellerStatus.ACTIVE);
    });

    it('should return empty array when no sellers match the status', async () => {
      mocks.prismaMock.seller.findMany.mockResolvedValue([]);

      const result = await repo.findAllByStatus(SellerStatus.BANNED);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should call prisma.seller.update with mapped persistence data', async () => {
      const entity = makeEntity({ name: 'Updated Shop' });
      mocks.prismaMock.seller.update.mockResolvedValue(
        makePrismaRow({ name: 'Updated Shop' }),
      );

      await repo.update(entity);

      expect(mocks.prismaMock.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: {
          name: 'Updated Shop',
          description: 'A test shop',
          userId: 'user-1',
          status: 'active',
          deletedAt: null,
          updatedAt: entity.updatedAt,
        },
      });
    });

    it('should return the updated domain entity', async () => {
      const entity = makeEntity({ name: 'Updated Shop' });
      mocks.prismaMock.seller.update.mockResolvedValue(
        makePrismaRow({ name: 'Updated Shop' }),
      );

      const result = await repo.update(entity);

      expect(result.name).toBe('Updated Shop');
      expect(result.sellerId.value).toBe('seller-1');
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt to current timestamp', async () => {
      mocks.prismaMock.seller.update.mockResolvedValue({});

      await repo.softDelete('seller-1');

      expect(mocks.prismaMock.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: { deletedAt: expect.any(Date) as Date },
      });
    });
  });

  describe('findByUserId', () => {
    it('should query by userId and exclude soft-deleted', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(null);

      await repo.findByUserId('user-1');

      expect(mocks.prismaMock.seller.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should return null when no seller linked to user', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(null);

      const result = await repo.findByUserId('user-999');

      expect(result).toBeNull();
    });

    it('should return the domain entity when found', async () => {
      mocks.prismaMock.seller.findFirst.mockResolvedValue(
        makePrismaRow({ userId: 'user-42' }),
      );

      const result = await repo.findByUserId('user-42');

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-42');
    });
  });

  describe('transactional save/update', () => {
    it('save() should accept a Prisma transaction client', async () => {
      const entity = makeEntity();
      mocks.txMock.seller.create.mockResolvedValue(makePrismaRow());

      await repo.save(entity, mocks.txMock as never);

      expect(mocks.txMock.seller.create).toHaveBeenCalled();
    });

    it('update() should accept a Prisma transaction client', async () => {
      const entity = makeEntity({ name: 'TX Update' });
      mocks.txMock.seller.update.mockResolvedValue(
        makePrismaRow({ name: 'TX Update' }),
      );

      await repo.update(entity, mocks.txMock as never);

      expect(mocks.txMock.seller.update).toHaveBeenCalled();
    });
  });
});
