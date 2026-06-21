import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { ConflictError, ValidationError } from '@/shared/kernel/app-error';

export interface CreateSellerDTO {
  name: string;
  description?: string;
  userId: string;
}

export class CreateSellerUseCase {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: CreateSellerDTO) {
    // 1. Validate name
    const trimmedName = dto.name?.trim() ?? '';
    if (!trimmedName) {
      throw new ValidationError('Seller name is required');
    }

    // 2. Validate userId
    const trimmedUserId = dto.userId?.trim() ?? '';
    if (!trimmedUserId) {
      throw new ValidationError('User ID is required');
    }

    // 3. Check name uniqueness (case-insensitive)
    const existingByName = await this.sellerRepository.findByName(trimmedName);
    if (existingByName) {
      throw new ConflictError('Seller name already exists');
    }

    // 4. Create seller entity
    const now = new Date();
    const sellerId = SellerId.create(crypto.randomUUID());
    const seller = await this.sellerRepository.save({
      sellerId,
      name: trimmedName,
      description: dto.description?.trim() ?? null,
      userId: trimmedUserId,
      status: SellerStatus.ACTIVE,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Record SELLER_CREATED event
    await this.outboxRepository.saveEvent(SellerEvents.SELLER_CREATED, {
      sellerId: seller.sellerId.value,
      name: seller.name,
      userId: seller.userId,
    });

    return seller;
  }
}
