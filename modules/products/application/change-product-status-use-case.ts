import { NotFoundError, ValidationError } from '@/shared/kernel/app-error';
import type {
  ProductEntity,
  ProductRepository,
} from '../domain/product-repository';
import {
  ProductStatus,
  VALID_TRANSITIONS,
} from '../domain/value-objects/product-status';

export interface ChangeProductStatusDTO {
  productId: string;
  status: ProductStatus;
  sellerId: string;
}

export class ChangeProductStatusUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(dto: ChangeProductStatusDTO): Promise<ProductEntity> {
    const product = await this.productRepository.findById(dto.productId, 'es');

    if (!product || product.sellerId !== dto.sellerId) {
      throw new NotFoundError('Product not found');
    }

    if (product.status === dto.status) {
      throw new ValidationError(`Product is already ${dto.status}`);
    }

    const allowed = VALID_TRANSITIONS[product.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new ValidationError(
        `Cannot transition from ${product.status} to ${dto.status}`,
      );
    }

    const updated: ProductEntity = {
      ...product,
      status: dto.status,
      updatedAt: new Date(),
    };

    const persisted = await this.productRepository.update(updated);
    if (!persisted) {
      throw new NotFoundError('Product not found');
    }

    return updated;
  }
}
