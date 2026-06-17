import { describe, it, expect } from 'vitest';
import { RoleId } from './role-id';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';

describe('RoleId', () => {
  describe('create()', () => {
    it('should return an instance with the provided value', () => {
      const id = RoleId.create('role-admin');
      expect(id).toBeInstanceOf(RoleId);
      expect(id.value).toBe('role-admin');
    });

    it('should throw on empty string', () => {
      expect(() => RoleId.create('')).toThrow('EntityId cannot be empty');
    });

    it('should throw on whitespace-only string', () => {
      expect(() => RoleId.create('   ')).toThrow('EntityId cannot be empty');
    });

    it('should trim whitespace from the value', () => {
      const id = RoleId.create('  role-admin  ');
      expect(id.value).toBe('role-admin');
    });
  });

  describe('equals()', () => {
    it('should return true for the same value', () => {
      const a = RoleId.create('role-1');
      const b = RoleId.create('role-1');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = RoleId.create('role-1');
      const b = RoleId.create('role-2');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different subclass with same value', () => {
      const roleId = RoleId.create('same-id');
      const userId = UserId.create('same-id');
      expect(roleId.equals(userId)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the value', () => {
      const id = RoleId.create('role-admin');
      expect(id.toString()).toBe('role-admin');
    });
  });
});
