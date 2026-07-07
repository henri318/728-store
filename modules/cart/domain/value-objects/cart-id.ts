import { EntityId } from '@/shared/kernel/domain/value-objects/entity-id';

/**
 * Strongly-typed identifier for a Cart aggregate.
 *
 * Extends the shared EntityId base. Equality compares both class identity
 * and string value, so a CartId and an OrderId with the same string are
 * never considered equal.
 */
export class CartId extends EntityId {
  static create(value: string): CartId {
    return new CartId(value);
  }

  private constructor(value: string) {
    super(value);
  }
}
