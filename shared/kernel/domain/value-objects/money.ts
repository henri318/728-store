import { Currency } from './currency';

export class Money {
  readonly amount: number;
  readonly currency: Currency;

  /**
   * Direct construction bypasses create() validation — used only internally by
   * arithmetic methods that may produce valid intermediate states
   * (e.g., negative from subtraction).
   */
  private constructor(amount: number, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
  }

  static create(amount: number, currency: Currency): Money {
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be a finite number');
    }

    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }

    if (!currency) {
      throw new Error('Currency is required');
    }

    return new Money(amount, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    const resultAmount = this.amount + other.amount;
    if (!Number.isFinite(resultAmount)) {
      throw new Error('Money addition resulted in a non-finite amount');
    }
    return new Money(resultAmount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const resultAmount = this.amount - other.amount;
    if (!Number.isFinite(resultAmount)) {
      throw new Error('Money subtraction resulted in a non-finite amount');
    }
    return new Money(resultAmount, this.currency);
  }

  multiply(multiplier: number): Money {
    if (!Number.isFinite(multiplier)) {
      throw new Error('Money multiplier must be a finite number');
    }
    const resultAmount = this.amount * multiplier;
    if (!Number.isFinite(resultAmount)) {
      throw new Error('Money multiplication resulted in a non-finite amount');
    }
    return new Money(resultAmount, this.currency);
  }

  equals(other: Money): boolean {
    return (
      other instanceof Money &&
      this.amount === other.amount &&
      this.currency === other.currency
    );
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot operate on Money with different currencies: ${this.currency} vs ${other.currency}`,
      );
    }
  }
}
