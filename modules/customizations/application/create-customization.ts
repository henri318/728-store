import type { CustomizationRepository } from '../domain/customization-repository';
import type { CustomizationEntity } from '../domain/entities/customization';
import { CustomizationOptions } from '../domain/value-objects/customization-options';
import { CustomizationNotFoundError } from '../domain/errors';

export interface CreateCustomizationDTO {
  productId: string;
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
}

/**
 * Product existence check — injected to avoid direct module coupling.
 * The caller (API layer) validates seller ownership before calling this use case.
 */
export interface ProductExistsPort {
  exists(productId: string): Promise<boolean>;
}

/**
 * CreateCustomizationUseCase — validates product exists, validates CustomizationOptions VO, persists.
 *
 * Spec REQ-CUST-01: productId must reference a valid product. The FK constraint
 * in Prisma provides database-level enforcement, but we also check at application
 * level to provide a clear domain error.
 */
export class CreateCustomization {
  constructor(
    private repo: CustomizationRepository,
    private productExists: ProductExistsPort,
  ) {}

  async execute(dto: CreateCustomizationDTO): Promise<CustomizationEntity> {
    // Validate product exists (throws if not)
    const exists = await this.productExists.exists(dto.productId);
    if (!exists) {
      throw new CustomizationNotFoundError(
        `Product ${dto.productId} not found`,
        'Cannot create customization: product does not exist',
      );
    }

    // Validate via VO (throws on invalid input)
    CustomizationOptions.create({
      text: dto.text,
      color: dto.color,
      size: dto.size,
      imageUrl: dto.imageUrl,
    });

    const entity: CustomizationEntity = {
      id: crypto.randomUUID(),
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
