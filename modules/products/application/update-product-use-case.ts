import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';
import type {
  ProductEntity,
  ProductRepository,
} from '../domain/product-repository';
import { ProductPrice } from '../domain/value-objects/product-price';
import {
  ProductStatus,
  VALID_TRANSITIONS,
} from '../domain/value-objects/product-status';
import { ProductCustomizationConfig } from '../domain/value-objects/product-customization-config';
import type { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

export interface UpdateProductDTO {
  productId: string;
  sellerId: string;
  locale: string;
  name?: string;
  description?: string;
  price?: number;
  status?: ProductStatus;
  customizationConfig?: unknown;
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outboxRepository?: OutboxRepository,
  ) {}

  async execute(dto: UpdateProductDTO): Promise<ProductEntity> {
    const product = await this.productRepository.findById(
      dto.productId,
      dto.locale,
    );

    if (!product || product.sellerId !== dto.sellerId) {
      throw new NotFoundError('Product not found');
    }

    const nextName = dto.name?.trim();
    if (nextName !== undefined && !nextName) {
      throw new ValidationError('Product name is required');
    }

    const nextPrice =
      dto.price !== undefined
        ? ProductPrice.create(dto.price, 'EUR' as Currency)
        : product.basePrice;

    const nextStatus = dto.status ?? product.status;
    if (dto.status && dto.status !== product.status) {
      const allowed = VALID_TRANSITIONS[product.status];
      if (!allowed || !allowed.includes(dto.status)) {
        throw new ValidationError(
          `Cannot transition from ${product.status} to ${dto.status}`,
        );
      }
    }

    const hasUpdates =
      dto.name !== undefined ||
      dto.description !== undefined ||
      dto.price !== undefined ||
      dto.status !== undefined ||
      dto.customizationConfig !== undefined;

    if (!hasUpdates) {
      throw new ValidationError('At least one field must be provided');
    }

    const currentTranslation = product.translations[0];
    const nextTranslation = {
      locale: dto.locale,
      name: nextName ?? currentTranslation?.name ?? '',
      description:
        dto.description !== undefined
          ? dto.description.trim() || null
          : (currentTranslation?.description ?? null),
    };

    const translations = product.translations.some(
      (translation) => translation.locale === dto.locale,
    )
      ? product.translations.map((translation) =>
          translation.locale === dto.locale ? nextTranslation : translation,
        )
      : [...product.translations, nextTranslation];

    const updated: ProductEntity = {
      ...product,
      basePrice: nextPrice,
      status: nextStatus,
      customizationConfig:
        dto.customizationConfig !== undefined
          ? ProductCustomizationConfig.fromJson(dto.customizationConfig)
          : product.customizationConfig,
      updatedAt: new Date(),
      translations,
    };

    const persisted = await this.productRepository.update(updated);
    if (!persisted) {
      throw new NotFoundError('Product not found');
    }

    await this.outboxRepository?.saveEvent(GlobalEvents.PRODUCT_UPDATED, {
      productId: updated.id,
      sellerId: updated.sellerId,
      status: updated.status,
    });

    return updated;
  }
}
