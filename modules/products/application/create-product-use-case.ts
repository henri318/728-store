import { randomUUID } from 'node:crypto';
import { ValidationError } from '@/shared/kernel/app-error';
import type {
  ProductEntity,
  ProductRepository,
} from '../domain/product-repository';
import { ProductPrice } from '../domain/value-objects/product-price';
import { ProductStatus } from '../domain/value-objects/product-status';
import { ProductCustomizationConfig } from '../domain/value-objects/product-customization-config';
import type { Currency } from '@/shared/kernel/domain/value-objects/currency';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

export interface CreateProductDTO {
  sellerId: string;
  sellerName: string;
  locale: string;
  name: string;
  description?: string;
  price: number;
  status?: ProductStatus;
  customizationConfig?: unknown;
  images?: Array<{
    url: string;
    alt: string;
  }>;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly outboxRepository?: OutboxRepository,
  ) {}

  async execute(dto: CreateProductDTO): Promise<ProductEntity> {
    if (!dto.name.trim()) {
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
      translations: [
        {
          locale: dto.locale,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
        },
      ],
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

    await this.productRepository.save(product);
    await this.outboxRepository?.saveEvent(GlobalEvents.PRODUCT_CREATED, {
      productId: product.id,
      sellerId: product.sellerId,
      status: product.status,
    });
    return product;
  }
}
