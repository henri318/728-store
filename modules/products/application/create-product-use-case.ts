import { randomUUID } from 'node:crypto';
import { ValidationError } from '@/shared/kernel/app-error';
import type {
  ProductEntity,
  ProductRepository,
} from '../domain/product-repository';
import { ProductPrice } from '../domain/value-objects/product-price';
import { ProductStatus } from '../domain/value-objects/product-status';
import { ProductCustomizationConfig } from '../domain/value-objects/product-customization-config';
import { hasDefaultLocaleTranslation } from '../domain/entities/product';
import type { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

export interface ProductTranslationDTO {
  locale?: string;
  name?: string;
  description?: string;
  tags?: string[] | null;
  sizes?: string[] | null;
  designChangeDescription?: string | null;
}

export interface CreateProductDTO {
  sellerId: string;
  sellerName: string;
  locale?: string;
  name?: string;
  description?: string;
  price: number;
  status?: ProductStatus;
  translation?: ProductTranslationDTO;
  translations?: ProductTranslationDTO[];
  customizationConfig?: unknown;
  images?: Array<{
    url: string;
    alt: string;
  }>;
}

function buildTranslations(
  dto: CreateProductDTO,
): ProductEntity['translations'] {
  let submitted: CreateProductDTO['translations'] = [];

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

  return submitted.map((translation) => {
    const locale = (translation.locale ?? dto.locale ?? '').trim();

    if (!locale) {
      throw new ValidationError('Product locale is required');
    }

    const name = (translation.name ?? dto.name ?? '').trim();

    if (!name) {
      throw new ValidationError('Product name is required');
    }

    return {
      locale,
      name,
      description: translation.description?.trim() || null,
      tags: translation.tags ?? [],
      sizes: translation.sizes ?? [],
      designChangeDescription:
        translation.designChangeDescription?.trim() || null,
    };
  });
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outboxRepository?: OutboxRepository,
  ) {}

  async execute(dto: CreateProductDTO): Promise<ProductEntity> {
    const translations = buildTranslations(dto);

    if (translations.length === 0) {
      throw new ValidationError('Product name is required');
    }

    const price = ProductPrice.create(dto.price, 'EUR' as Currency);
    const now = new Date();
    const productId = randomUUID();
    const product: ProductEntity = {
      id: productId,
      basePrice: price,
      sellerId: dto.sellerId,
      sellerName: dto.sellerName,
      status: dto.status ?? ProductStatus.DRAFT,
      categoryId: null,
      category: null,
      customizationConfig: ProductCustomizationConfig.fromJson(
        dto.customizationConfig ?? null,
      ),
      createdAt: now,
      updatedAt: now,
      translations,
      images: (dto.images ?? []).map((image, index) => ({
        id: randomUUID(),
        url: image.url,
        alt: image.alt,
        position: index,
        productId,
        createdAt: now,
      })),
      tags: [],
    };

    if (
      product.status === ProductStatus.ACTIVE &&
      !hasDefaultLocaleTranslation(product)
    ) {
      throw new ValidationError('default locale translation required');
    }

    await this.productRepository.save(product);
    await this.outboxRepository?.saveEvent(GlobalEvents.PRODUCT_CREATED, {
      productId: product.id,
      sellerId: product.sellerId,
      status: product.status,
    });
    return product;
  }
}
