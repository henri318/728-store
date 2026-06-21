import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { NotFoundError } from '@/shared/kernel/app-error';

export interface DeleteSellerDTO {
  sellerId: string;
}

export class DeleteSellerUseCase {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: DeleteSellerDTO) {
    // 1. Validate seller exists
    const seller = await this.sellerRepository.findById(dto.sellerId);
    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    // 2. Soft-delete: set deletedAt timestamp
    const now = new Date();
    await this.sellerRepository.update({
      ...seller,
      deletedAt: now,
      updatedAt: now,
    });

    // 3. Emit SELLER_DELETED event
    await this.outboxRepository.saveEvent(SellerEvents.SELLER_DELETED, {
      sellerId: seller.sellerId.value,
    });

    return { deleted: true };
  }
}
