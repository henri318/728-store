import { EntityId } from '@/shared/kernel/domain/value-objects/entity-id';

/**
 * Strongly-typed identifier for a CartItem (a single line in a cart).
 *
 * Class identity matters: a CartItemId must never be equal to a CartId even
 * when their string values coincide, which is why we extend the shared
 * EntityId (not a free string alias).
 */
export class CartItemId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): CartItemId {
    return new CartItemId(value);
  }
}
