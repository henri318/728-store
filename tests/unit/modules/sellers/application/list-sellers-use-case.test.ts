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

  it('returns an empty paginated result when no sellers exist', async () => {
    const result = await useCase.execute({});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(0);
  });

  it('returns paginated sellers with defaults', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Shop 1',
        createdAt: new Date('2025-01-02'),
      }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Shop 2',
        createdAt: new Date('2025-01-01'),
      }),
    );

    const result = await useCase.execute({ page: 1, pageSize: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.items[0].name).toBe('Shop 1');
  });

  it('excludes soft-deleted sellers', async () => {
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

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Active');
    expect(result.total).toBe(1);
  });

  it('filters by status', async () => {
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

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Active');
    expect(result.total).toBe(1);
  });

  it('filters by q across name and description', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Camisas SA',
        description: 'Ropa',
      }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Zapatos SA',
        description: 'Camisas info',
      }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s3'),
        name: 'Otro',
        description: 'Zapatos',
      }),
    );

    const result = await useCase.execute({ q: 'camisa' });

    expect(result.items).toHaveLength(2);
    expect(result.items.map((s) => s.name).sort()).toEqual([
      'Camisas SA',
      'Zapatos SA',
    ]);
  });

  it('sorts by name ascending', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Beta' }),
    );
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s2'), name: 'Alpha' }),
    );
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s3'), name: 'Gamma' }),
    );

    const result = await useCase.execute({ sortBy: 'name', sortDir: 'asc' });

    expect(result.items.map((s) => s.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('sorts by name descending', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Beta' }),
    );
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s2'), name: 'Alpha' }),
    );
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s3'), name: 'Gamma' }),
    );

    const result = await useCase.execute({ sortBy: 'name', sortDir: 'desc' });

    expect(result.items.map((s) => s.name)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('sorts by createdAt descending by default', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Newest',
        createdAt: new Date('2025-01-03'),
      }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Oldest',
        createdAt: new Date('2025-01-01'),
      }),
    );

    const result = await useCase.execute({});

    expect(result.items[0].name).toBe('Newest');
    expect(result.items[1].name).toBe('Oldest');
  });

  it('returns an empty page when page is beyond range', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Only' }),
    );

    const result = await useCase.execute({ page: 99, pageSize: 10 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('composes status and q filters', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        name: 'Active Camisa',
        status: SellerStatus.ACTIVE,
      }),
    );
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s2'),
        name: 'Suspended Camisa',
        status: SellerStatus.SUSPENDED,
      }),
    );

    const result = await useCase.execute({
      status: SellerStatus.ACTIVE,
      q: 'camisa',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Active Camisa');
  });
});
