import type { CustomizationRepository } from '../domain/customization-repository';
import type { CustomizationEntity } from '../domain/entities/customization';
import { CustomizationOptions } from '../domain/value-objects/customization-options';
import {
  CustomizationNotFoundError,
  CustomizationForbiddenError,
} from '../domain/errors';

export interface UpdateCustomizationDTO {
  id: string;
  sellerId: string; // Caller must provide seller context for ownership validation
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
}

/**
 * Product ownership check — injected to avoid direct module coupling.
 * Returns the sellerId that owns the product associated with a customization.
 */
export interface ProductOwnershipPort {
  getSellerIdForCustomization(customizationId: string): Promise<string | null>;
}

/**
 * UpdateCustomizationUseCase — loads by id, asserts ownership via product seller,
 * mutates fields, re-validates. Spec REQ-CUST-03.
 */
export class UpdateCustomization {
  constructor(
    private repo: CustomizationRepository,
    private productOwnership: ProductOwnershipPort,
  ) {}

  async execute(dto: UpdateCustomizationDTO): Promise<CustomizationEntity> {
    const existing = await this.repo.findById(dto.id);
    if (!existing) {
      throw new CustomizationNotFoundError(`Customization ${dto.id} not found`);
    }

    // Validate ownership: customization's product must belong to the caller's seller
    const ownerSellerId =
      await this.productOwnership.getSellerIdForCustomization(dto.id);
    if (ownerSellerId !== dto.sellerId) {
      throw new CustomizationForbiddenError();
    }

    // Build merged entity with only provided fields changed
    const merged = {
      ...existing,
      ...(dto.text !== undefined ? { text: dto.text ?? null } : {}),
      ...(dto.color !== undefined ? { color: dto.color ?? null } : {}),
      ...(dto.size !== undefined ? { size: dto.size ?? null } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl ?? null } : {}),
    };

    // Re-validate via VO (throws on invalid input)
    CustomizationOptions.create({
      text: merged.text,
      color: merged.color,
      size: merged.size,
      imageUrl: merged.imageUrl,
    });

    return this.repo.save(merged);
  }
}
