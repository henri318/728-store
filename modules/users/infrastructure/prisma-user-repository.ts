import { prisma } from '@/shared/infrastructure/prisma';
import type { PrismaClient } from '@prisma/client';
import { UserEntity, UserRepository } from '../domain/user-repository';
import { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import { Email } from '@/shared/kernel/domain/value-objects/email';
import { Address } from '@/shared/kernel/domain/value-objects/address';
import { RoleId } from '@/shared/kernel/domain/identifiers/role-id';
import { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';
import type { UserAddressInput } from '../domain/user-address';

/** Maps a Prisma User row to the domain UserEntity (with VOs). */
export function toDomain(user: {
  id: string;
  email: string | null;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  role: string;
  address?: {
    street: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  emailVerified: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserEntity {
  if (!user.email) throw new Error('User email is required');

  const address =
    user.address?.street &&
    user.address.city &&
    user.address.postalCode &&
    user.address.country
      ? Address.create(
          user.address.street,
          user.address.city,
          user.address.postalCode,
          user.address.country,
        )
      : null;

  return {
    userId: UserId.create(user.id),
    email: Email.create(user.email),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    address,
    roleId: RoleId.create(user.role ?? 'CUSTOMER'),
    passwordHash: user.passwordHash
      ? PasswordHash.create(user.passwordHash)
      : null,
    emailVerified: user.emailVerified ?? null,
    deletedAt: user.deletedAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class PrismaUserRepository implements UserRepository {
  async findAddressByUserId(userId: string): Promise<UserAddressInput | null> {
    return prisma.userAddress.findUnique({
      where: { userId },
      select: {
        street: true,
        houseNumber: true,
        addressLine1: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        county: true,
        state: true,
        country: true,
        countryCode: true,
        formattedAddress: true,
        floor: true,
        door: true,
        stairway: true,
        block: true,
        instructions: true,
      },
    });
  }

  async saveAddress(userId: string, address: UserAddressInput): Promise<void> {
    await prisma.userAddress.upsert({
      where: { userId },
      update: address,
      create: { userId, ...address },
    });
  }

  async clearAddress(userId: string): Promise<void> {
    await prisma.userAddress.deleteMany({ where: { userId } });
  }
  async save(user: UserEntity, tx: PrismaClient = prisma): Promise<UserEntity> {
    const savedUser = await tx.user.upsert({
      where: { id: user.userId.value },
      update: {
        email: user.email.value,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash?.value ?? null,
        role: user.roleId.value,
        deletedAt: user.deletedAt ?? null,
      },
      create: {
        id: user.userId.value,
        email: user.email.value,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash?.value ?? null,
        role: user.roleId.value,
        deletedAt: user.deletedAt ?? null,
      },
    });

    await tx.userAddress.upsert({
      where: { userId: user.userId.value },
      update: addressData(user.address),
      create: { userId: user.userId.value, ...addressData(user.address) },
    });

    return toDomain({
      ...savedUser,
      address: await tx.userAddress.findUnique({
        where: { userId: user.userId.value },
      }),
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: { address: true },
    });

    if (!user) return null;
    return toDomain(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { address: true },
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
        passwordHash: user.passwordHash?.value ?? null,
        role: user.roleId.value,
        deletedAt: user.deletedAt ?? null,
      },
    });

    await tx.userAddress.upsert({
      where: { userId: user.userId.value },
      update: addressData(user.address),
      create: { userId: user.userId.value, ...addressData(user.address) },
    });

    return toDomain({
      ...updatedUser,
      address: await tx.userAddress.findUnique({
        where: { userId: user.userId.value },
      }),
    });
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

function addressData(address: Address | null) {
  return {
    street: address?.street ?? null,
    city: address?.city ?? null,
    postalCode: address?.postalCode ?? null,
    country: address?.country ?? null,
    countryCode: address?.country?.toUpperCase() === 'ES' ? 'ES' : null,
  };
}
