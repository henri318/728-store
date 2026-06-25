import { prisma } from '@/shared/infrastructure/prisma';
import type {
  UserLookupPort,
  UserLookupResult,
} from '@/modules/auth/domain/user-lookup';
import type { AuthRole } from '@/modules/auth/domain/entities/user-lookup-result';

/**
 * DB role string → canonical AuthRole.
 * The DB stores the role as a plain string; this validates it against the
 * canonical set and rejects unknown values by defaulting to CUSTOMER.
 */
function mapDbRole(dbRole: string): AuthRole {
  const canonical: Record<string, AuthRole> = {
    ADMIN: 'ADMIN',
    SUPPORT: 'SUPPORT',
    DESIGNER: 'DESIGNER',
    CUSTOMER: 'CUSTOMER',
  };
  return canonical[dbRole] ?? 'CUSTOMER';
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
