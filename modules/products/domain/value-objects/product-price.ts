import { Money } from '@/shared/kernel/domain/value-objects/money';
import type { Currency } from '@/shared/kernel/domain/value-objects/currency';

/**
 * ProductPrice — a value object wrapping Money with product-specific validation.
 *
 * Follows the project's VO pattern: private constructor, static create(),
 * readonly fields, equals() by value.
 *
 * Rules:
 *  - Delegates to Money.create() for base validation
 *  - Additional constraint: amount must be strictly > 0 (no zero prices)
 */
export class ProductPrice {
  readonly money: Money;

  private constructor(money: Money) {
    this.money = money;
  }

  get amount(): number {
    return this.money.amount;
  }

  get currency(): Currency {
    return this.money.currency;
  }

  static create(amount: number, currency: Currency): ProductPrice {
    const money = Money.create(amount, currency);

    if (money.amount <= 0) {
      throw new Error('ProductPrice amount must be greater than zero');
    }

    return new ProductPrice(money);
  }

  equals(other: ProductPrice): boolean {
    return other instanceof ProductPrice && this.money.equals(other.money);
  }
}
