import { describe, it, expect } from 'vitest';
import { Address } from '@/shared/kernel/domain/value-objects/address';

describe('Address', () => {
  describe('create()', () => {
    it('should create a valid address with all fields', () => {
      const address = Address.create('123 Main St', 'Springfield', '12345', 'US');
      expect(address).toBeInstanceOf(Address);
      expect(address.street).toBe('123 Main St');
      expect(address.city).toBe('Springfield');
      expect(address.postalCode).toBe('12345');
      expect(address.country).toBe('US');
    });

    it('should trim all fields', () => {
      const address = Address.create(
        '  123 Main St  ',
        '  Springfield  ',
        '  12345  ',
        '  US  ',
      );
      expect(address.street).toBe('123 Main St');
      expect(address.city).toBe('Springfield');
      expect(address.postalCode).toBe('12345');
      expect(address.country).toBe('US');
    });

    it('should reject empty street', () => {
      expect(() =>
        Address.create('', 'Springfield', '12345', 'US'),
      ).toThrow('All address fields are required');
    });

    it('should reject empty city', () => {
      expect(() =>
        Address.create('123 Main St', '', '12345', 'US'),
      ).toThrow('All address fields are required');
    });

    it('should reject empty postalCode', () => {
      expect(() =>
        Address.create('123 Main St', 'Springfield', '', 'US'),
      ).toThrow('All address fields are required');
    });

    it('should reject empty country', () => {
      expect(() =>
        Address.create('123 Main St', 'Springfield', '12345', ''),
      ).toThrow('All address fields are required');
    });

    it('should reject whitespace-only street', () => {
      expect(() =>
        Address.create('   ', 'Springfield', '12345', 'US'),
      ).toThrow('All address fields are required');
    });
  });

  describe('equals()', () => {
    it('should compare all fields', () => {
      const a = Address.create('123 Main St', 'Springfield', '12345', 'US');
      const b = Address.create('123 Main St', 'Springfield', '12345', 'US');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false if street differs', () => {
      const a = Address.create('123 Main St', 'Springfield', '12345', 'US');
      const b = Address.create('456 Oak Ave', 'Springfield', '12345', 'US');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false if city differs', () => {
      const a = Address.create('123 Main St', 'Springfield', '12345', 'US');
      const b = Address.create('123 Main St', 'Shelbyville', '12345', 'US');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false if postalCode differs', () => {
      const a = Address.create('123 Main St', 'Springfield', '12345', 'US');
      const b = Address.create('123 Main St', 'Springfield', '54321', 'US');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false if country differs', () => {
      const a = Address.create('123 Main St', 'Springfield', '12345', 'US');
      const b = Address.create('123 Main St', 'Springfield', '12345', 'CA');
      expect(a.equals(b)).toBe(false);
    });
  });
});
