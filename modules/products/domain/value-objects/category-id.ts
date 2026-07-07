import { EntityId } from '@/shared/kernel/domain/value-objects/entity-id';

/**
 * CategoryId — a value object representing a category identifier.
 *
 * Extends EntityId, inheriting validation (non-empty, trimmed)
 * and equality semantics. Identical pattern to ProductId/SellerId.
 */
export class CategoryId extends EntityId {
  static create(value: string): CategoryId {
    return new CategoryId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
