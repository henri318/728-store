import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import {
  SellerStatus,
  VALID_TRANSITIONS,
} from '@/modules/sellers/domain/seller-status';
import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';

export interface ChangeSellerStatusDTO {
  sellerId: string;
  status: SellerStatus;
}

export class ChangeSellerStatusUseCase {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(dto: ChangeSellerStatusDTO) {
    // 1. Find seller (pre-flight validation — outside the transaction
    // because no writes happen here)
    const seller = await this.sellerRepository.findById(dto.sellerId);
    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    // 2. Same-status transition is a no-op
    if (seller.status === dto.status) {
      throw new ValidationError(`Seller is already ${dto.status}`);
    }

    // 3. Validate transition is allowed
    const allowed = VALID_TRANSITIONS[seller.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new ValidationError(
        `Cannot transition from ${seller.status} to ${dto.status}`,
      );
    }

    // 4. Persist status change + outbox event atomically
    // (Transactional Outbox Pattern): if saveEvent fails, the update
    // is rolled back so the database never holds a status change with
    // a missing domain event.
    return this.transactionRunner.run(async (tx) => {
      const now = new Date();
      const updated = await this.sellerRepository.update(
        {
          ...seller,
          status: dto.status,
          updatedAt: now,
        },
        tx,
      );

      await this.outboxRepository.saveEvent(
        SellerEvents.SELLER_STATUS_CHANGED,
        {
          sellerId: updated.sellerId.value,
          previousStatus: seller.status,
          newStatus: updated.status,
        },
        tx,
      );

      return updated;
    });
  }
}
