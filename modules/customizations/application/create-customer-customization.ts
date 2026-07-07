import type { CustomizationRepository } from '../domain/customization-repository';
import type { CustomizationEntity } from '../domain/entities/customization';
import {
  CustomizationOptions,
  type CustomizationDesignPosition,
} from '../domain/value-objects/customization-options';
import { ValidationError } from '@/shared/kernel/app-error';
import type { ProductCapabilityPort } from '@/modules/products/domain/product-capability-port';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';

export interface CreateCustomerCustomizationDTO {
  productId: string;
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
  designPosition?: CustomizationDesignPosition | null;
}

export class CreateCustomerCustomization {
  constructor(
    private readonly repo: CustomizationRepository,
    private readonly productCapability: ProductCapabilityPort,
  ) {}

  async execute(
    dto: CreateCustomerCustomizationDTO,
    ownerUserId: string,
  ): Promise<CustomizationEntity> {
    if (!ownerUserId) {
      throw new ValidationError('Owner user id is required', 'Invalid user');
    }

    const config =
      (await this.productCapability.getConfig(dto.productId)) ??
      ProductCustomizationConfig.default();

    this.assertAllowed(dto, config);
    CustomizationOptions.create(dto);

    const entity: CustomizationEntity = {
      id: crypto.randomUUID(),
      productId: dto.productId,
      text: dto.text ?? null,
      color: dto.color ?? null,
      size: dto.size ?? null,
      imageUrl: dto.imageUrl ?? null,
      designPosition: dto.designPosition ?? null,
      createdAt: new Date(),
    };

    return this.repo.save(entity);
  }

  private assertAllowed(
    dto: CreateCustomerCustomizationDTO,
    config: ProductCustomizationConfig,
  ): void {
    const hasText = dto.text !== undefined && dto.text !== null;

    if (hasText && !config.allowsText()) {
      throw new ValidationError(
        'This product does not support text customization',
        'Customization is not allowed for this product',
      );
    }

    const hasImage = dto.imageUrl !== undefined && dto.imageUrl !== null;
    const hasDesignPosition =
      dto.designPosition !== undefined && dto.designPosition !== null;
    // A canvas-only customization is also a "has image" signal — the
    // mockup canvas embeds imageUrl inside designPosition, so a
    // canvas-only draft must satisfy the photo requirement.
    const hasImageForCapability = hasImage || hasDesignPosition;

    if (hasImageForCapability && !config.allowsPhoto()) {
      throw new ValidationError(
        'This product does not support photo customization',
        'Customization is not allowed for this product',
      );
    }

    const hasStyle =
      (dto.color !== undefined && dto.color !== null) ||
      (dto.size !== undefined && dto.size !== null);

    if (hasStyle && !config.allowsStyleOptions()) {
      throw new ValidationError(
        'This product does not support color or size options',
        'Customization is not allowed for this product',
      );
    }

    const mode = config.mode;
    const textRequired = mode === 'description' || mode === 'text';

    if (textRequired && !hasText) {
      throw new ValidationError(
        'Text customization is required for this product',
        'Customization is not allowed for this product',
      );
    }

    const photoRequired = mode === 'photo' || mode === 'text_photo';

    if (photoRequired && !hasImageForCapability) {
      throw new ValidationError(
        'Photo customization is required for this product',
        'Customization is not allowed for this product',
      );
    }

    if (mode === 'text_photo' && (!hasText || !hasImageForCapability)) {
      throw new ValidationError(
        'Both text and photo customization are required for this product',
        'Customization is not allowed for this product',
      );
    }
  }
}
