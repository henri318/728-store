import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeSellerStatusUseCase } from '@/modules/sellers/application/use-cases/change-seller-status-use-case';
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

describe('ChangeSellerStatusUseCase', () => {
  let sellerRepository: MemorySellerRepository;
  let outboxRepository: MemoryOutboxRepository;
  let useCase: ChangeSellerStatusUseCase;

  beforeEach(() => {
    sellerRepository = new MemorySellerRepository();
    outboxRepository = new MemoryOutboxRepository();
    useCase = new ChangeSellerStatusUseCase(sellerRepository, outboxRepository);
  });

  it('should change status from ACTIVE to SUSPENDED', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        status: SellerStatus.ACTIVE,
      }),
    );

    const result = await useCase.execute({
      sellerId: 's1',
      status: SellerStatus.SUSPENDED,
    });

    expect(result.status).toBe(SellerStatus.SUSPENDED);
  });

  it('should change status from ACTIVE to BANNED', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        status: SellerStatus.ACTIVE,
      }),
    );

    const result = await useCase.execute({
      sellerId: 's1',
      status: SellerStatus.BANNED,
    });

    expect(result.status).toBe(SellerStatus.BANNED);
  });

  it('should change status from SUSPENDED to ACTIVE', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        status: SellerStatus.SUSPENDED,
      }),
    );

    const result = await useCase.execute({
      sellerId: 's1',
      status: SellerStatus.ACTIVE,
    });

    expect(result.status).toBe(SellerStatus.ACTIVE);
  });

  it('should change status from SUSPENDED to BANNED', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        status: SellerStatus.SUSPENDED,
      }),
    );

    const result = await useCase.execute({
      sellerId: 's1',
      status: SellerStatus.BANNED,
    });

    expect(result.status).toBe(SellerStatus.BANNED);
  });

  it('should throw error when transitioning from BANNED (terminal state)', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        status: SellerStatus.BANNED,
      }),
    );

    await expect(
      useCase.execute({ sellerId: 's1', status: SellerStatus.ACTIVE }),
    ).rejects.toThrow('Cannot transition from banned');
  });

  it('should throw error for same-status transition', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        status: SellerStatus.ACTIVE,
      }),
    );

    await expect(
      useCase.execute({ sellerId: 's1', status: SellerStatus.ACTIVE }),
    ).rejects.toThrow('Seller is already');
  });

  it('should record SELLER_STATUS_CHANGED event with previous and new status', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        status: SellerStatus.ACTIVE,
      }),
    );

    await useCase.execute({
      sellerId: 's1',
      status: SellerStatus.SUSPENDED,
    });

    expect(outboxRepository.events.length).toBe(1);
    expect(outboxRepository.events[0].eventType).toBe(
      SellerEvents.SELLER_STATUS_CHANGED,
    );
    const payload = outboxRepository.events[0].payload as {
      sellerId: string;
      previousStatus: string;
      newStatus: string;
    };
    expect(payload.sellerId).toBe('s1');
    expect(payload.previousStatus).toBe(SellerStatus.ACTIVE);
    expect(payload.newStatus).toBe(SellerStatus.SUSPENDED);
  });

  it('should throw NotFoundError when seller does not exist', async () => {
    await expect(
      useCase.execute({ sellerId: 'nonexistent', status: SellerStatus.ACTIVE }),
    ).rejects.toThrow('Seller not found');
  });

  it('should throw NotFoundError when seller is soft-deleted', async () => {
    sellerRepository.seed(
      makeSeller({
        sellerId: SellerId.create('s1'),
        deletedAt: new Date(),
      }),
    );

    await expect(
      useCase.execute({ sellerId: 's1', status: SellerStatus.ACTIVE }),
    ).rejects.toThrow('Seller not found');
  });
});
