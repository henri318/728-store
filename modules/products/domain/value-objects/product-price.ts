import { Money } from '@/shared/kernel/domain/value-objects/money';
import type { Currency } from '@/shared/kernel/domain/value-objects/currency';

export class ProductPrice {
  readonly money: Money;

  static create(amount: number, currency: Currency): ProductPrice {
    const money = Money.create(amount, currency);

    if (money.amount <= 0) {
      throw new Error('ProductPrice amount must be greater than zero');
    }

    return new ProductPrice(money);
  }

  private constructor(money: Money) {
    this.money = money;
  }

  get amount(): number {
    return this.money.amount;
  }

  get currency(): Currency {
    return this.money.currency;
  }

  format(): string {
    return Money.format(this.amount, this.currency);
  }

  equals(other: ProductPrice): boolean {
    return other instanceof ProductPrice && this.money.equals(other.money);
  }
}
