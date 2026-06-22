import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { PrismaUserRepository } from '@/modules/users/infrastructure/prisma-user-repository';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import { Address } from '@/shared/kernel/domain/value-objects/address';
import type { UserEntity } from '@/modules/users/domain/entities/user';

/**
 * PrismaUserRepository — Integration tests against real Docker PostgreSQL.
 *
 * Verifies CRUD operations, soft-delete filtering, and VO mapping
 * through the actual Prisma adapter (no mocks).
 */
describe('PrismaUserRepository — Integration', () => {
  let repo: PrismaUserRepository;

  beforeAll(async () => {
    await cleanupDb();
    repo = new PrismaUserRepository();
  });

  afterAll(async () => {
    await cleanupDb();
  });

  function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
    return {
      userId: UserId.create('user-int-1'),
      email: Email.create('test@example.com'),
      firstName: 'Test',
      lastName: 'User',
      address: null,
      roleId: RoleId.create('CUSTOMER'),
      passwordHash: PasswordHash.create('hashed-password-123'),
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    };
  }

  describe('save + findById', () => {
    it('should persist a user and retrieve it by ID', async () => {
      const user = makeUser();
      const saved = await repo.save(user);

      expect(saved.userId.value).toBe('user-int-1');
      expect(saved.email.value).toBe('test@example.com');
      expect(saved.firstName).toBe('Test');
      expect(saved.lastName).toBe('User');
      expect(saved.roleId.value).toBe('CUSTOMER');

      const found = await repo.findById('user-int-1');
      expect(found).not.toBeNull();
      expect(found!.email.value).toBe('test@example.com');
      expect(found!.firstName).toBe('Test');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should upsert on conflict (save twice with same ID)', async () => {
      const user = makeUser({ firstName: 'Original' });
      await repo.save(user);

      const updated = makeUser({ firstName: 'Updated' });
      await repo.save(updated);

      const found = await repo.findById('user-int-1');
      expect(found!.firstName).toBe('Updated');
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      await repo.save(makeUser());

      const found = await repo.findByEmail('test@example.com');
      expect(found).not.toBeNull();
      expect(found!.userId.value).toBe('user-int-1');
    });

    it('should return null for non-existent email', async () => {
      const found = await repo.findByEmail('nobody@example.com');
      expect(found).toBeNull();
    });

    it('should normalize email (trim + lowercase)', async () => {
      await repo.save(makeUser());

      const found = await repo.findByEmail('  TEST@EXAMPLE.COM  ');
      expect(found).not.toBeNull();
      expect(found!.userId.value).toBe('user-int-1');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      await repo.save(makeUser());

      const user = await repo.findById('user-int-1');
      const updated = await repo.update({
        ...user!,
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.lastName).toBe('Name');

      const found = await repo.findById('user-int-1');
      expect(found!.firstName).toBe('Updated');
    });
  });

  describe('markEmailVerified', () => {
    it('should set emailVerified to current timestamp', async () => {
      await repo.save(makeUser());

      const before = new Date();
      await repo.markEmailVerified('user-int-1');
      const after = new Date();

      const found = await repo.findById('user-int-1');
      expect(found!.emailVerified).not.toBeNull();
      const ts = found!.emailVerified!.getTime();
      expect(ts).toBeGreaterThanOrEqual(before.getTime());
      expect(ts).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('soft-delete', () => {
    it('should set deletedAt on the user', async () => {
      const user = makeUser({
        userId: UserId.create('user-del'),
        email: Email.create('del@example.com'),
      });
      await repo.save(user);

      await repo.update({
        ...user,
        deletedAt: new Date(),
      });

      // findById still returns soft-deleted users (filtering is at query level)
      const found = await repo.findById('user-del');
      expect(found).not.toBeNull();
      expect(found!.deletedAt).not.toBeNull();
    });
  });

  describe('address mapping', () => {
    it('should persist and retrieve address fields', async () => {
      const user = makeUser({
        userId: UserId.create('user-addr'),
        email: Email.create('addr@example.com'),
        address: Address.create('Calle 1', 'BOG', '110111', 'CO'),
      });
      await repo.save(user);

      const found = await repo.findById('user-addr');
      expect(found!.address).not.toBeNull();
      expect(found!.address!.street).toBe('Calle 1');
      expect(found!.address!.city).toBe('BOG');
      expect(found!.address!.postalCode).toBe('110111');
      expect(found!.address!.country).toBe('CO');
    });

    it('should handle null address', async () => {
      const user = makeUser({
        userId: UserId.create('user-no-addr'),
        email: Email.create('noaddr@example.com'),
      });
      await repo.save(user);

      const found = await repo.findById('user-no-addr');
      expect(found!.address).toBeNull();
    });
  });
});
