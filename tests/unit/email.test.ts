import { describe, it, expect } from 'vitest';
import { Email } from '@/shared/kernel/domain/value-objects/email';

describe('Email', () => {
  describe('create()', () => {
    it('should trim and lowercase the email', () => {
      const email = Email.create('  Test@Test.com  ');
      expect(email.value).toBe('test@test.com');
    });

    it('should accept valid email: test@test.com', () => {
      const email = Email.create('test@test.com');
      expect(email).toBeInstanceOf(Email);
      expect(email.value).toBe('test@test.com');
    });

    it('should accept valid email: user.name@test.es', () => {
      const email = Email.create('user.name@test.es');
      expect(email).toBeInstanceOf(Email);
      expect(email.value).toBe('user.name@test.es');
    });

    it('should accept valid email: admin@company.co.uk', () => {
      const email = Email.create('admin@company.co.uk');
      expect(email).toBeInstanceOf(Email);
      expect(email.value).toBe('admin@company.co.uk');
    });

    it('should reject null', () => {
      expect(() => Email.create(null as any)).toThrow();
    });

    it('should reject undefined', () => {
      expect(() => Email.create(undefined as any)).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => Email.create('')).toThrow('Email cannot be empty');
    });

    it('should reject whitespace-only', () => {
      expect(() => Email.create('   ')).toThrow('Email cannot be empty');
    });

    it('should reject strings longer than 254 chars', () => {
      const longEmail = 'a'.repeat(242) + '@test.com'; // 242 + 9 = 251 — OK
      const tooLong = 'a'.repeat(246) + '@test.com'; // 246 + 9 = 255 — too long
      expect(() => Email.create(tooLong)).toThrow('Email must be at most 254 characters');
    });

    it('should reject "test" (no @)', () => {
      expect(() => Email.create('test')).toThrow('Invalid email format');
    });

    it('should reject "test@" (no domain)', () => {
      expect(() => Email.create('test@')).toThrow('Invalid email format');
    });

    it('should reject "@test.com" (no local part)', () => {
      expect(() => Email.create('@test.com')).toThrow('Invalid email format');
    });

    it('should reject "test@com" (no dot in domain)', () => {
      expect(() => Email.create('test@com')).toThrow('Invalid email format');
    });

    it('should reject "test @test.com" (space in email)', () => {
      expect(() => Email.create('test @test.com')).toThrow('Invalid email format');
    });
  });

  describe('equals()', () => {
    it('should compare normalized value (case-insensitive)', () => {
      const a = Email.create('Test@Test.com');
      const b = Email.create('test@test.com');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different emails', () => {
      const a = Email.create('test@test.com');
      const b = Email.create('other@test.com');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the value', () => {
      const email = Email.create('test@test.com');
      expect(email.toString()).toBe('test@test.com');
    });
  });
});
