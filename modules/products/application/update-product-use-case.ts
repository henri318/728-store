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
import { hasDefaultLocaleTranslation } from '../domain/entities/product';
import type { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { ProductTranslationDTO } from './create-product-use-case';
import {
  buildProductImages,
  type ProductImageInput,
} from './product-image-builder';

function assertPublishable(
  product: ProductEntity,
  nextStatus: ProductStatus,
): void {
  if (
    nextStatus === ProductStatus.ACTIVE &&
    !hasDefaultLocaleTranslation(product)
  ) {
    throw new ValidationError('default locale translation required');
  }
}

export interface UpdateProductDTO {
  productId: string;
  sellerId: string;
  locale?: string;
  name?: string;
  description?: string;
  price?: number;
  status?: ProductStatus;
  translation?: ProductTranslationDTO;
  translations?: Array<
    ProductTranslationDTO & { locale?: string; name?: string }
  >;
  customizationConfig?: unknown;
  images?: ProductImageInput[];
}

function buildTranslations(
  dto: UpdateProductDTO,
  product: ProductEntity,
): ProductEntity['translations'] {
  let submitted: UpdateProductDTO['translations'] = [];

  if (dto.translations?.length) {
    submitted = dto.translations;
  } else if (dto.locale && dto.name) {
    submitted = [
      {
        locale: dto.locale,
        name: dto.name,
        description: dto.description,
        tags: dto.translation?.tags,
        sizes: dto.translation?.sizes,
        designChangeDescription: dto.translation?.designChangeDescription,
      },
    ];
  }

  if (submitted.length === 0) {
    return product.translations;
  }

  const merged = new Map(
    product.translations.map((translation) => [
      translation.locale,
      translation,
    ]),
  );

  for (const translation of submitted) {
    const locale = (translation.locale ?? dto.locale ?? '').trim();

    if (!locale) {
      throw new ValidationError('Product locale is required');
    }

    const name = (translation.name ?? dto.name ?? '').trim();

    if (!name) {
      throw new ValidationError('Product name is required');
    }

    merged.set(locale, {
      locale,
      name,
      description: translation.description?.trim() || null,
      tags: translation.tags ?? [],
      sizes: translation.sizes ?? [],
      designChangeDescription:
        translation.designChangeDescription?.trim() || null,
    });
  }

  return merged.values().toArray();
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outboxRepository?: OutboxRepository,
    private readonly txRunner?: TransactionRunner,
  ) {}

  async execute(dto: UpdateProductDTO): Promise<ProductEntity> {
    const run = <T>(fn: (tx: unknown) => Promise<T>) =>
      this.txRunner ? this.txRunner.run(fn) : fn(undefined);

    return run(async (tx) => {
      const product = await this.productRepository.findById(
        dto.productId,
        dto.locale ?? 'es',
      );

      if (!product || product.sellerId !== dto.sellerId) {
        throw new NotFoundError('Product not found');
      }

      const nextName = dto.name?.trim();
      if (nextName !== undefined && !nextName) {
        throw new ValidationError('Product name is required');
      }

      const nextPrice =
        dto.price === undefined
          ? product.basePrice
          : ProductPrice.create(dto.price, 'EUR' as Currency);

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
        dto.translation !== undefined ||
        dto.translations !== undefined ||
        dto.customizationConfig !== undefined ||
        dto.images !== undefined;

      if (!hasUpdates) {
        throw new ValidationError('At least one field must be provided');
      }

      const translations = buildTranslations(dto, product);

      const now = new Date();

      const updated: ProductEntity = {
        ...product,
        basePrice: nextPrice,
        status: nextStatus,
        customizationConfig:
          dto.customizationConfig === undefined
            ? product.customizationConfig
            : ProductCustomizationConfig.fromJson(dto.customizationConfig),
        images:
          dto.images === undefined
            ? product.images
            : buildProductImages(dto.images, {
                productId: product.id,
                createdAt: now,
                existingImages: product.images,
              }),
        updatedAt: now,
        translations,
      };

      assertPublishable(updated, nextStatus);

      const persisted = await this.productRepository.update(updated);
      if (!persisted) {
        throw new NotFoundError('Product not found');
      }

      await this.outboxRepository?.saveEvent(
        GlobalEvents.PRODUCT_UPDATED,
        {
          productId: updated.id,
          sellerId: updated.sellerId,
          status: updated.status,
        },
        tx,
      );

      return updated;
    });
  }
}
