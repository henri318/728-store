import { describe, it, expect } from 'vitest';
import { VerificationToken } from '@/modules/auth/domain/value-objects/verification-token';

describe('VerificationToken', () => {
  describe('create()', () => {
    it('should store the token value', () => {
      const token = VerificationToken.create('abc123def456');
      expect(token).toBeInstanceOf(VerificationToken);
      expect(token.value).toBe('abc123def456');
    });

    it('should reject empty string', () => {
      expect(() => VerificationToken.create('')).toThrow(
        'Verification token cannot be empty',
      );
    });

    it('should reject whitespace-only string', () => {
      expect(() => VerificationToken.create('   ')).toThrow(
        'Verification token cannot be empty',
      );
    });

    it('should trim whitespace', () => {
      const token = VerificationToken.create('  abc123  ');
      expect(token.value).toBe('abc123');
    });
  });

  describe('equals()', () => {
    it('should return true for same token value', () => {
      const a = VerificationToken.create('token-abc');
      const b = VerificationToken.create('token-abc');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different token values', () => {
      const a = VerificationToken.create('token-abc');
      const b = VerificationToken.create('token-xyz');
      expect(a.equals(b)).toBe(false);
    });
  });
});
