import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { ConflictError, NotFoundError } from '@/shared/kernel/app-error';

export interface UpdateSellerDTO {
  sellerId: string;
  name?: string;
  description?: string;
}

export class UpdateSellerUseCase {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(dto: UpdateSellerDTO) {
    // 1. Find seller
    const existing = await this.sellerRepository.findById(dto.sellerId);
    if (!existing) {
      throw new NotFoundError('Seller not found');
    }

    const changedFields: string[] = [];

    // 2. Apply name if provided and different
    let name = existing.name;
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        // empty name after trim — keep existing, no change
      } else if (trimmedName !== existing.name) {
        // Check uniqueness (case-insensitive)
        const existingByName =
          await this.sellerRepository.findByName(trimmedName);
        if (existingByName) {
          throw new ConflictError('Seller name already exists');
        }
        name = trimmedName;
        changedFields.push('name');
      }
    }

    // 3. Apply description if provided and different
    let description = existing.description;
    if (dto.description !== undefined) {
      const trimmedDesc = dto.description.trim();
      const newDesc = trimmedDesc || null;
      if (newDesc !== existing.description) {
        description = newDesc;
        changedFields.push('description');
      }
    }

    // 4. Persist updated seller
    const now = new Date();
    const updated = await this.sellerRepository.update({
      ...existing,
      name,
      description,
      updatedAt: now,
    });

    // 5. Emit event if anything changed
    if (changedFields.length > 0) {
      await this.outboxRepository.saveEvent(SellerEvents.SELLER_UPDATED, {
        sellerId: updated.sellerId.value,
        changedFields,
      });
    }

    return updated;
  }
}
