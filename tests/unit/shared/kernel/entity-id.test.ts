import { describe, it, expect } from 'vitest';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { OrderId } from '@/shared/kernel/domain/value-objects/order-id';

describe('EntityId', () => {
  describe('create()', () => {
    it('should return an instance with the provided value', () => {
      const id = UserId.create('user-123');
      expect(id).toBeInstanceOf(UserId);
      expect(id.value).toBe('user-123');
    });

    it('should throw on empty string', () => {
      expect(() => UserId.create('')).toThrow('EntityId cannot be empty');
    });

    it('should throw on whitespace-only string', () => {
      expect(() => UserId.create('   ')).toThrow('EntityId cannot be empty');
    });

    it('should trim whitespace from the value', () => {
      const id = UserId.create('  user-456  ');
      expect(id.value).toBe('user-456');
    });
  });

  describe('equals()', () => {
    it('should return true for the same value', () => {
      const a = UserId.create('user-1');
      const b = UserId.create('user-1');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = UserId.create('user-1');
      const b = UserId.create('user-2');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different subclass with same value', () => {
      const userId = UserId.create('same-id');
      const orderId = OrderId.create('same-id');
      expect(userId.equals(orderId)).toBe(false);
    });

    it('should return false when comparing two different subclasses (OrderId vs UserId)', () => {
      const orderId = OrderId.create('abc');
      const userId = UserId.create('abc');
      expect(orderId.equals(userId)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the value', () => {
      const id = UserId.create('user-789');
      expect(id.toString()).toBe('user-789');
    });
  });
});
