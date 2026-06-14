import { prisma } from '@/shared/infrastructure/prisma';
import { UserEntity, UserRepository } from '../domain/user-repository';

export class PrismaUserRepository implements UserRepository {
  async save(user: UserEntity): Promise<UserEntity> {
    const savedUser = await prisma.user.upsert({
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

    return {
      id: savedUser.id,
      email: savedUser.email!,
      name: savedUser.name!,
      passwordHash: savedUser.passwordHash!,
      role: savedUser.role,
    };
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email!,
      name: user.name!,
      passwordHash: user.passwordHash!,
      role: user.role,
    };
  }
}
