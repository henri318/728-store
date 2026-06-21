import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateSellerUseCase } from '@/modules/sellers/application/use-cases/update-seller-use-case';
import { MemorySellerRepository } from '@/tests/doubles/memory-seller-repository';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
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

describe('UpdateSellerUseCase', () => {
  let sellerRepository: MemorySellerRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: UpdateSellerUseCase;

  beforeEach(() => {
    sellerRepository = new MemorySellerRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new UpdateSellerUseCase(sellerRepository, outboxRepository);
  });

  it('should update seller name', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Old Name' }),
    );

    const result = await useCase.execute({
      sellerId: 's1',
      name: 'New Name',
    });

    expect(result.name).toBe('New Name');
  });

  it('should update seller description', async () => {
    sellerRepository.seed(makeSeller({ sellerId: SellerId.create('s1') }));

    const result = await useCase.execute({
      sellerId: 's1',
      description: 'Updated description',
    });

    expect(result.description).toBe('Updated description');
  });

  it('should update both name and description', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Old' }),
    );

    const result = await useCase.execute({
      sellerId: 's1',
      name: 'New',
      description: 'New desc',
    });

    expect(result.name).toBe('New');
    expect(result.description).toBe('New desc');
  });

  it('should record SELLER_UPDATED event when name changes', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Old' }),
    );

    await useCase.execute({ sellerId: 's1', name: 'New' });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      SellerEvents.SELLER_UPDATED,
    );
    const payload = outboxRepository.events[0].payload as {
      sellerId: string;
      changedFields: string[];
    };
    expect(payload.sellerId).toBe('s1');
    expect(payload.changedFields).toContain('name');
  });

  it('should record SELLER_UPDATED event when description changes', async () => {
    sellerRepository.seed(makeSeller({ sellerId: SellerId.create('s1') }));

    await useCase.execute({ sellerId: 's1', description: 'New desc' });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      SellerEvents.SELLER_UPDATED,
    );
    const payload = outboxRepository.events[0].payload as {
      changedFields: string[];
    };
    expect(payload.changedFields).toContain('description');
  });

  it('should not record event when nothing changes', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Same' }),
    );

    await useCase.execute({ sellerId: 's1', name: 'Same' });

    expect(outboxRepository.events.length).toBe(0);
  });

  it('should throw NotFoundError when seller does not exist', async () => {
    await expect(
      useCase.execute({ sellerId: 'nonexistent', name: 'New' }),
    ).rejects.toThrow('Seller not found');
  });

  it('should throw ConflictError when new name already exists', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Shop A' }),
    );
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s2'), name: 'Shop B' }),
    );

    await expect(
      useCase.execute({ sellerId: 's1', name: 'Shop B' }),
    ).rejects.toThrow('Seller name already exists');
  });

  it('should allow keeping the same name (no uniqueness conflict)', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Shop A' }),
    );

    const result = await useCase.execute({ sellerId: 's1', name: 'Shop A' });

    expect(result.name).toBe('Shop A');
    expect(outboxRepository.events.length).toBe(0);
  });

  it('should trim name before saving', async () => {
    sellerRepository.seed(
      makeSeller({ sellerId: SellerId.create('s1'), name: 'Old' }),
    );

    const result = await useCase.execute({
      sellerId: 's1',
      name: '  Trimmed  ',
    });

    expect(result.name).toBe('Trimmed');
  });

  it('should throw NotFoundError when seller is soft-deleted', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        deletedAt: new Date(),
      }),
    );

    await expect(
      useCase.execute({ sellerId: 's1', name: 'New' }),
    ).rejects.toThrow('Seller not found');
  });
});
