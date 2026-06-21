import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteSellerUseCase } from '@/modules/sellers/application/use-cases/delete-seller-use-case';
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

describe('DeleteSellerUseCase', () => {
  let sellerRepository: MemorySellerRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: DeleteSellerUseCase;

  beforeEach(() => {
    sellerRepository = new MemorySellerRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new DeleteSellerUseCase(sellerRepository, outboxRepository);
  });

  it('should soft-delete a seller', async () => {
    sellerRepository.seed(makeSeller({ sellerId: SellerId.create('s1') }));

    const result = await useCase.execute({ sellerId: 's1' });

    expect(result.deleted).toBe(true);
  });

  it('should set deletedAt on the seller', async () => {
    sellerRepository.seed(makeSeller({ sellerId: SellerId.create('s1') }));

    await useCase.execute({ sellerId: 's1' });

    const seller = await sellerRepository.findById('s1');
    expect(seller).toBeNull(); // findById excludes soft-deleted
  });

  it('should record SELLER_DELETED event', async () => {
    sellerRepository.seed(makeSeller({ sellerId: SellerId.create('s1') }));

    await useCase.execute({ sellerId: 's1' });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      SellerEvents.SELLER_DELETED,
    );
    const payload = outboxRepository.events[0].payload as { sellerId: string };
    expect(payload.sellerId).toBe('s1');
  });

  it('should throw NotFoundError when seller does not exist', async () => {
    await expect(useCase.execute({ sellerId: 'nonexistent' })).rejects.toThrow(
      'Seller not found',
    );
  });

  it('should throw NotFoundError when seller is already soft-deleted', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        deletedAt: new Date(),
      }),
    );

    await expect(useCase.execute({ sellerId: 's1' })).rejects.toThrow(
      'Seller not found',
    );
  });
});
