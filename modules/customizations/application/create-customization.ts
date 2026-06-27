import type { CustomizationRepository } from '../domain/customization-repository';
import type { CustomizationEntity } from '../domain/entities/customization';
import { CustomizationOptions } from '../domain/value-objects/customization-options';

export interface CreateCustomizationDTO {
  sellerId: string;
  productId: string;
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
}

/**
 * CreateCustomizationUseCase — validates CustomizationOptions VO, persists.
 *
 * Spec REQ-CUST-01: sellerId must match the product's seller (enforced
 * by the caller / API layer; the use case trusts the sellerId passed in).
 */
export class CreateCustomization {
  constructor(private repo: CustomizationRepository) {}

  async execute(dto: CreateCustomizationDTO): Promise<CustomizationEntity> {
    // Validate via VO (throws on invalid input)
    CustomizationOptions.create({
      text: dto.text,
      color: dto.color,
      size: dto.size,
      imageUrl: dto.imageUrl,
    });

    const entity: CustomizationEntity = {
      id: crypto.randomUUID(),
      sellerId: dto.sellerId,
      productId: dto.productId,
      text: dto.text ?? null,
      color: dto.color ?? null,
      size: dto.size ?? null,
      imageUrl: dto.imageUrl ?? null,
      createdAt: new Date(),
    };

    return this.repo.save(entity);
  }
}
