import { describe, it, expect } from 'vitest';
import type { UserEntity } from '@/modules/users/domain/entities/user';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

/**
 * Task 2.3 — UserEntity must include optional `deletedAt` field
 * for soft-delete support.
 */
describe('UserEntity — soft-delete support', () => {
  it('should accept deletedAt as an optional field on the entity', () => {
    const userId = UserId.create('user-test');
    const email = Email.create('test@example.com');
    const roleId = RoleId.create('CUSTOMER');
    const passwordHash = PasswordHash.create('hashedpassword123');

    // Construct a full UserEntity-compatible object WITH deletedAt
    const user: UserEntity = {
      userId,
      email,
      firstName: 'Test',
      lastName: 'User',
      address: null,
      roleId,
      passwordHash,
      emailVerified: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      deletedAt: new Date('2025-06-01'), // ← new field
    };

    expect(user.deletedAt).toBeInstanceOf(Date);
    expect(user.deletedAt!.toISOString()).toBe('2025-06-01T00:00:00.000Z');
  });

  it('should allow deletedAt to be null for active users', () => {
    const userId = UserId.create('user-active');
    const email = Email.create('active@example.com');
    const roleId = RoleId.create('CUSTOMER');
    const passwordHash = PasswordHash.create('hashedpassword123');

    const user: UserEntity = {
      userId,
      email,
      firstName: 'Active',
      lastName: 'User',
      address: null,
      roleId,
      passwordHash,
      emailVerified: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      deletedAt: null, // ← active user has null deletedAt
    };

    expect(user.deletedAt).toBeNull();
  });

  it('should allow deletedAt to be undefined (omitted) for backward compatibility', () => {
    const userId = UserId.create('user-legacy');
    const email = Email.create('legacy@example.com');
    const roleId = RoleId.create('CUSTOMER');
    const passwordHash = PasswordHash.create('hashedpassword123');

    const user: UserEntity = {
      userId,
      email,
      firstName: 'Legacy',
      lastName: 'User',
      address: null,
      roleId,
      passwordHash,
      emailVerified: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      // deletedAt intentionally omitted
    };

    expect(user.deletedAt).toBeUndefined();
  });
});
