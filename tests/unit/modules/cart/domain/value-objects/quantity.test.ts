import { describe, it, expect } from 'vitest';
import { Quantity } from '@/modules/cart/domain/value-objects/quantity';
import { InvalidQuantityError } from '@/modules/cart/domain/errors';

/**
 * Task 1.x — Quantity value object.
 *
 * Tests:
 * - create() accepts integers in [1, 99]
 * - create() rejects 0, 100, negatives, non-integers, NaN
 * - value() returns the stored amount
 * - equals() compares by value
 * - increase() returns a new Quantity with the added amount
 * - decrease() returns a new Quantity with the subtracted amount
 * - arithmetic cannot push the result out of [1, 99]
 */
describe('Quantity', () => {
  describe('create()', () => {
    it('accepts 1 (lower bound)', () => {
      const q = Quantity.create(1);
      expect(q).toBeInstanceOf(Quantity);
      expect(q.value).toBe(1);
    });

    it('accepts 99 (upper bound)', () => {
      const q = Quantity.create(99);
      expect(q.value).toBe(99);
    });

    it('accepts a value in the middle of the range', () => {
      const q = Quantity.create(42);
      expect(q.value).toBe(42);
    });

    it('rejects 0', () => {
      expect(() => Quantity.create(0)).toThrow(InvalidQuantityError);
    });

    it('rejects 100 (above the range)', () => {
      expect(() => Quantity.create(100)).toThrow(InvalidQuantityError);
    });

    it('rejects negative numbers', () => {
      expect(() => Quantity.create(-1)).toThrow(InvalidQuantityError);
    });

    it('rejects non-integers', () => {
      expect(() => Quantity.create(1.5)).toThrow(InvalidQuantityError);
    });

    it('rejects NaN', () => {
      expect(() => Quantity.create(Number.NaN)).toThrow(InvalidQuantityError);
    });

    it('rejects Infinity', () => {
      expect(() => Quantity.create(Number.POSITIVE_INFINITY)).toThrow(
        InvalidQuantityError,
      );
    });

    it('rejects -Infinity', () => {
      expect(() => Quantity.create(Number.NEGATIVE_INFINITY)).toThrow(
        InvalidQuantityError,
      );
    });
  });

  describe('equals()', () => {
    it('returns true for the same value', () => {
      const a = Quantity.create(5);
      const b = Quantity.create(5);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = Quantity.create(5);
      const b = Quantity.create(6);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('increase()', () => {
    it('returns a new Quantity with the sum of values', () => {
      const a = Quantity.create(2);
      const b = Quantity.create(3);
      const sum = a.increase(b);
      expect(sum.value).toBe(5);
      expect(sum).toBeInstanceOf(Quantity);
    });

    it('does not mutate the original', () => {
      const a = Quantity.create(2);
      const b = Quantity.create(3);
      a.increase(b);
      expect(a.value).toBe(2);
    });

    it('rejects when the result would exceed 99', () => {
      const a = Quantity.create(90);
      const b = Quantity.create(10);
      expect(() => a.increase(b)).toThrow(InvalidQuantityError);
    });

    it('rejects when the result would land exactly on 100', () => {
      const a = Quantity.create(50);
      const b = Quantity.create(50);
      expect(() => a.increase(b)).toThrow(InvalidQuantityError);
    });
  });

  describe('decrease()', () => {
    it('returns a new Quantity with the difference', () => {
      const a = Quantity.create(5);
      const b = Quantity.create(2);
      const diff = a.decrease(b);
      expect(diff.value).toBe(3);
      expect(diff).toBeInstanceOf(Quantity);
    });

    it('does not mutate the original', () => {
      const a = Quantity.create(5);
      const b = Quantity.create(2);
      a.decrease(b);
      expect(a.value).toBe(5);
    });

    it('rejects when the result would be below 1', () => {
      const a = Quantity.create(2);
      const b = Quantity.create(2);
      expect(() => a.decrease(b)).toThrow(InvalidQuantityError);
    });

    it('rejects when subtracting more than the value', () => {
      const a = Quantity.create(3);
      const b = Quantity.create(5);
      expect(() => a.decrease(b)).toThrow(InvalidQuantityError);
    });
  });
});
