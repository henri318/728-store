import { describe, it, expect } from 'vitest';
import { ProductDescription } from '@/modules/products/domain/value-objects/product-description';

describe('ProductDescription', () => {
  describe('create()', () => {
    it('should create with valid description', () => {
      const desc = ProductDescription.create(
        'A high-quality wireless headphone',
      )!;
      expect(desc).toBeInstanceOf(ProductDescription);
      expect(desc.value).toBe('A high-quality wireless headphone');
    });

    it('should trim whitespace from the value', () => {
      const desc = ProductDescription.create('  Una taza de café  ')!;
      expect(desc.value).toBe('Una taza de café');
    });

    it('should create with empty string', () => {
      const desc = ProductDescription.create('')!;
      expect(desc.value).toBe('');
    });

    it('should create with whitespace-only string and normalize to empty', () => {
      const desc = ProductDescription.create('   ')!;
      expect(desc.value).toBe('');
    });

    it('should create with exactly 2000 characters', () => {
      const value = 'A'.repeat(2000);
      const desc = ProductDescription.create(value)!;
      expect(desc.value).toBe(value);
    });

    it('should allow null and return null', () => {
      const result = ProductDescription.create(null);
      expect(result).toBeNull();
    });

    it('should reject string longer than 2000 characters', () => {
      const value = 'A'.repeat(2001);
      expect(() => ProductDescription.create(value)).toThrow(
        'ProductDescription cannot exceed 2000 characters',
      );
    });
  });

  describe('equals()', () => {
    it('should return true for the same value', () => {
      const a = ProductDescription.create('Description')!;
      const b = ProductDescription.create('Description')!;
      expect(a.equals(b)).toBe(true);
    });

    it('should return true after trimming', () => {
      const a = ProductDescription.create('Description')!;
      const b = ProductDescription.create('  Description  ')!;
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = ProductDescription.create('Short')!;
      const b = ProductDescription.create('Longer description')!;
      expect(a.equals(b)).toBe(false);
    });
  });
});
