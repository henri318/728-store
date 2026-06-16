import { describe, it, expect } from 'vitest';
import { PasswordHash } from '@/modules/auth/domain/value-objects/password-hash';

describe('PasswordHash', () => {
  describe('create()', () => {
    it('should store the hash value', () => {
      const hash = PasswordHash.create('$2b$10$abcdefghijklmnopqrstuv');
      expect(hash).toBeInstanceOf(PasswordHash);
      expect(hash.value).toBe('$2b$10$abcdefghijklmnopqrstuv');
    });

    it('should reject empty string', () => {
      expect(() => PasswordHash.create('')).toThrow(
        'Password hash cannot be empty',
      );
    });

    it('should reject whitespace-only string', () => {
      expect(() => PasswordHash.create('   ')).toThrow(
        'Password hash cannot be empty',
      );
    });

    it('should reject string shorter than 8 chars', () => {
      expect(() => PasswordHash.create('1234567')).toThrow(
        'Password hash must be at least 8 characters',
      );
    });

    it('should accept string with exactly 8 chars', () => {
      const hash = PasswordHash.create('12345678');
      expect(hash.value).toBe('12345678');
    });
  });

  describe('equals()', () => {
    it('should return true for same hash value', () => {
      const a = PasswordHash.create('$2b$04$abc123def456ghi789jkl012');
      const b = PasswordHash.create('$2b$04$abc123def456ghi789jkl012');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different hash values', () => {
      const a = PasswordHash.create('$2b$04$abc123def456ghi789jkl012');
      const b = PasswordHash.create('$2b$04$zyx987wvu654tsr321qpo098');
      expect(a.equals(b)).toBe(false);
    });
  });
});
