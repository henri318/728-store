import { describe, it, expect, beforeEach } from 'vitest';
import { GetSellerUseCase } from '@/modules/sellers/application/use-cases/get-seller-use-case';
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

describe('GetSellerUseCase', () => {
  let sellerRepository: MemorySellerRepository;
  let useCase: GetSellerUseCase;

  beforeEach(() => {
    sellerRepository = new MemorySellerRepository();
    useCase = new GetSellerUseCase(sellerRepository);
  });

  it('should return seller by ID', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Shop 1' }),
    );

    const result = await useCase.execute({ sellerId: 's1' });

    expect(result.name).toBe('Shop 1');
    expect(result.sellerId.value).toBe('s1');
  });

  it('should throw NotFoundError when seller does not exist', async () => {
    await expect(useCase.execute({ sellerId: 'nonexistent' })).rejects.toThrow(
      'Seller not found',
    );
  });

  it('should throw NotFoundError when seller is soft-deleted', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Deleted Shop',
        deletedAt: new Date(),
      }),
    );

    await expect(useCase.execute({ sellerId: 's1' })).rejects.toThrow(
      'Seller not found',
    );
  });

  it('should return seller with SUSPENDED status', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Suspended Shop',
        status: SellerStatus.SUSPENDED,
      }),
    );

    const result = await useCase.execute({ sellerId: 's1' });

    expect(result.status).toBe(SellerStatus.SUSPENDED);
  });
});
