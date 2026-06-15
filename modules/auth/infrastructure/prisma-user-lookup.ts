import { prisma } from '@/shared/infrastructure/prisma';
import type {
  UserLookupPort,
  UserLookupResult,
} from '@/modules/auth/domain/user-lookup';
import type { Role } from '@/modules/auth/domain/roles';

/**
 * Prisma adapter for the UserLookupPort domain port.
 *
 * Selects only the columns the port promises ({id, role}) — never leaks
 * the full UserEntity to authorization code.
 */
export class PrismaUserLookup implements UserLookupPort {
  async findById(userId: string): Promise<UserLookupResult | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) return null;
    return { id: user.id, role: user.role as Role };
  }
}
