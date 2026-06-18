import { prisma } from '@/shared/infrastructure/prisma';
import type {
  UserLookupPort,
  UserLookupResult,
} from '@/modules/auth/domain/user-lookup';
import type { Role } from '@/modules/roles/domain/roles';

/**
 * Maps legacy DB role strings to the new canonical Role type.
 * S4 migration will update DB values; this shim bridges the gap.
 */
function mapDbRole(dbRole: string): Role {
  const mapping: Record<string, Role> = {
    admin: 'ADMIN',
    guest: 'CUSTOMER',
    client: 'CUSTOMER',
    shop: 'CUSTOMER',
  };
  return mapping[dbRole] ?? 'CUSTOMER';
}

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
    return { id: user.id, role: mapDbRole(user.role) };
  }
}
