import { InvalidQuantityError } from '@/modules/cart/domain/errors';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

/**
 * Quantity — number of units of a product inside a cart item.
 *
 * Constrained to integers in [1, 99] (spec REQ-CART-002). Arithmetic methods
 * return a new instance and reject results that fall outside the range.
 *
 * Immutable: every operation that would change the amount produces a new
 * Quantity rather than mutating the receiver.
 */
export class Quantity {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(amount: number): Quantity {
    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      throw new InvalidQuantityError(
        `Quantity must be a finite integer, got: ${amount}`,
      );
    }
    if (amount < MIN_QUANTITY || amount > MAX_QUANTITY) {
      throw new InvalidQuantityError(
        `Quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}, got: ${amount}`,
      );
    }
    return new Quantity(amount);
  }

  equals(other: Quantity): boolean {
    return other instanceof Quantity && this.value === other.value;
  }

  increase(other: Quantity): Quantity {
    return Quantity.create(this.value + other.value);
  }

  decrease(other: Quantity): Quantity {
    return Quantity.create(this.value - other.value);
  }
}
