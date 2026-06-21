import { describe, it, expect, beforeEach } from 'vitest';
import { ListSellersUseCase } from '@/modules/sellers/application/use-cases/list-sellers-use-case';
import { MemorySellerRepository } from '@/tests/doubles/memory-seller-repository';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import type { SellerEntity } from '@/modules/sellers/domain/seller';

function makeSeller(overrides: Partial<SellerEntity> = {}): SellerEntity {
  return {
    sellerId: SellerId.create('seller-1'),
    name: 'Test Shop',
    description: 'A test shop',
    userId: 'user-1',
    status: SellerStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ListSellersUseCase', () => {
  let sellerRepository: MemorySellerRepository;
  let useCase: ListSellersUseCase;

  beforeEach(() => {
    sellerRepository = new MemorySellerRepository();
    useCase = new ListSellersUseCase(sellerRepository);
  });

  it('should return all non-deleted sellers', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Shop 1' }),
    );
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s2'), name: 'Shop 2' }),
    );

    const result = await useCase.execute({});

    expect(result).toHaveLength(2);
  });

  it('should return empty array when no sellers exist', async () => {
    const result = await useCase.execute({});

    expect(result).toHaveLength(0);
  });

  it('should exclude soft-deleted sellers', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Active' }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Deleted',
        deletedAt: new Date(),
      }),
    );

    const result = await useCase.execute({});

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Active');
  });

  it('should filter by ACTIVE status', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Active',
        status: SellerStatus.ACTIVE,
      }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Suspended',
        status: SellerStatus.SUSPENDED,
      }),
    );

    const result = await useCase.execute({ status: SellerStatus.ACTIVE });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Active');
  });

  it('should filter by SUSPENDED status', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Active',
        status: SellerStatus.ACTIVE,
      }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Suspended',
        status: SellerStatus.SUSPENDED,
      }),
    );

    const result = await useCase.execute({ status: SellerStatus.SUSPENDED });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Suspended');
  });

  it('should return empty when filtering by status with no matches', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Active',
        status: SellerStatus.ACTIVE,
      }),
    );

    const result = await useCase.execute({ status: SellerStatus.BANNED });

    expect(result).toHaveLength(0);
  });
});
