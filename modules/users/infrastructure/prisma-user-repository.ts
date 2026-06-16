import { prisma } from '@/shared/infrastructure/prisma';
import { UserEntity, UserRepository } from '../domain/user-repository';

export class PrismaUserRepository implements UserRepository {
  async save(user: UserEntity, tx: any = prisma): Promise<UserEntity> {
    const savedUser = await tx.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
      },
    });

    if (!savedUser.email) throw new Error('User email is required');
    if (!savedUser.name) throw new Error('User name is required');
    if (!savedUser.passwordHash) throw new Error('User password hash is required');

    return {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      passwordHash: savedUser.passwordHash,
      role: savedUser.role,
      emailVerified: savedUser.emailVerified ?? null,
    };
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    if (!user.email) throw new Error('User email is required');
    if (!user.name) throw new Error('User name is required');
    if (!user.passwordHash) throw new Error('User password hash is required');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role,
      emailVerified: user.emailVerified ?? null,
    };
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    if (!user.email) throw new Error('User email is required');
    if (!user.name) throw new Error('User name is required');
    if (!user.passwordHash) throw new Error('User password hash is required');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role,
      emailVerified: user.emailVerified ?? null,
    };
  }

  async markEmailVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }
}
