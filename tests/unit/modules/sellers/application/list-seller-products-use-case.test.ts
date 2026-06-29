import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListSellerProductsUseCase } from '@/modules/sellers/application/use-cases/list-seller-products-use-case';
import type { ProductQuery } from '@/modules/sellers/application/use-cases/list-seller-products-use-case';
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

describe('ListSellerProductsUseCase', () => {
  let sellerRepository: MemorySellerRepository;
  let productQuery: ProductQuery;
  let executeMock: ReturnType<typeof vi.fn>;
  let capturedFilter: object | undefined;
  let useCase: ListSellerProductsUseCase;

  beforeEach(() => {
    sellerRepository = new MemorySellerRepository();
    capturedFilter = undefined;
    executeMock = vi.fn((filter: object) => {
      capturedFilter = filter;
      return Promise.resolve({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    });
    productQuery = { execute: executeMock as ProductQuery['execute'] };
    useCase = new ListSellerProductsUseCase(sellerRepository, productQuery);
  });

  it('resolves the seller from the current user and delegates to the product query', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('seller-123'),
        userId: 'user-123',
      }),
    );

    const result = await useCase.execute({
      userId: 'user-123',
      q: 'camiseta',
      page: 2,
      pageSize: 10,
    });

    expect(capturedFilter).toEqual({
      q: 'camiseta',
      page: 2,
      pageSize: 10,
      sellerId: 'seller-123',
    });
    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });

  it('throws NotFoundError when the current user is not linked to a seller', async () => {
    await expect(useCase.execute({ userId: 'missing-user' })).rejects.toThrow(
      'Seller not found',
    );

    expect(executeMock).not.toHaveBeenCalled();
  });
});
