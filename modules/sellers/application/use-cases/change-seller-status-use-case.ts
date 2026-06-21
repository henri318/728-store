import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
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
  ) {}

  async execute(dto: ChangeSellerStatusDTO) {
    // 1. Find seller
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

    // 4. Apply status change
    const now = new Date();
    const updated = await this.sellerRepository.update({
      ...seller,
      status: dto.status,
      updatedAt: now,
    });

    // 5. Record SELLER_STATUS_CHANGED event
    await this.outboxRepository.saveEvent(SellerEvents.SELLER_STATUS_CHANGED, {
      sellerId: updated.sellerId.value,
      previousStatus: seller.status,
      newStatus: updated.status,
    });

    return updated;
  }
}
