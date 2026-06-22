import { prisma } from '@/shared/infrastructure/prisma';
import type { PrismaClient } from '@prisma/client';
import { UserEntity, UserRepository } from '../domain/user-repository';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { Address } from '@/shared/kernel/domain/value-objects/address';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

/** Maps a Prisma User row to the domain UserEntity (with VOs). */
export function toDomain(user: {
  id: string;
  email: string | null;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  role: string;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  emailVerified: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserEntity {
  if (!user.email) throw new Error('User email is required');
  if (!user.passwordHash) throw new Error('User password hash is required');

  let address: Address | null = null;
  if (
    user.addressStreet &&
    user.addressCity &&
    user.addressPostalCode &&
    user.addressCountry
  ) {
    address = Address.create(
      user.addressStreet,
      user.addressCity,
      user.addressPostalCode,
      user.addressCountry,
    );
  }

  return {
    userId: UserId.create(user.id),
    email: Email.create(user.email),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    address,
    roleId: RoleId.create(user.role ?? 'CUSTOMER'),
    passwordHash: PasswordHash.create(user.passwordHash),
    emailVerified: user.emailVerified ?? null,
    deletedAt: user.deletedAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class PrismaUserRepository implements UserRepository {
  async save(user: UserEntity, tx: PrismaClient = prisma): Promise<UserEntity> {
    const savedUser = await tx.user.upsert({
      where: { id: user.userId.value },
      update: {
        email: user.email.value,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash.value,
        role: user.roleId.value,
        addressStreet: user.address?.street ?? null,
        addressCity: user.address?.city ?? null,
        addressPostalCode: user.address?.postalCode ?? null,
        addressCountry: user.address?.country ?? null,
        deletedAt: user.deletedAt ?? null,
      },
      create: {
        id: user.userId.value,
        email: user.email.value,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash.value,
        role: user.roleId.value,
        addressStreet: user.address?.street ?? null,
        addressCity: user.address?.city ?? null,
        addressPostalCode: user.address?.postalCode ?? null,
        addressCountry: user.address?.country ?? null,
        deletedAt: user.deletedAt ?? null,
      },
    });

    return toDomain(savedUser);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) return null;
    return toDomain(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;
    return toDomain(user);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }

  async update(
    user: UserEntity,
    tx: PrismaClient = prisma,
  ): Promise<UserEntity> {
    const updatedUser = await tx.user.update({
      where: { id: user.userId.value },
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email.value,
        passwordHash: user.passwordHash.value,
        role: user.roleId.value,
        addressStreet: user.address?.street ?? null,
        addressCity: user.address?.city ?? null,
        addressPostalCode: user.address?.postalCode ?? null,
        addressCountry: user.address?.country ?? null,
        deletedAt: user.deletedAt ?? null,
      },
    });

    return toDomain(updatedUser);
  }

  /**
   * @deprecated Use soft-delete via `update()` with `deletedAt` set instead.
   * This hard-deletes the user row from the database.
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
}
