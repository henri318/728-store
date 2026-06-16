import { NextResponse } from 'next/server';
import { Role } from '@/modules/auth/domain/roles';
import type { SessionPort } from '@/modules/auth/domain/session';
import type { UserLookupPort } from '@/modules/auth/domain/user-lookup';

/**
 * Factory: create an authorization helper bound to specific ports.
 *
 * Use this when you need isolated authorization (e.g. tests, multi-tenant).
 * The factory has ZERO knowledge of NextAuth, Prisma, or any concrete
 * implementation — it only talks to domain ports.
 *
 * Architecture:
 *   sessionPort.getSession()   →  who is the user?
 *   lookup.findById(userId)    →  what role does the user have?
 *   requireRole(roles)         →  is the role allowed?
 *
 * Usage:
 *   const auth = createAuthorization(sessionPort, lookupPort);
 *   export const POST = auth.requireRole('admin')(async function handler(req) { ... });
 */
export function createAuthorization(
  sessionPort: SessionPort,
  lookup: UserLookupPort,
) {
  /**
   * Wraps an API route handler with role-based authorization.
   *
   * The role is **verified from the database** on every request — it never trusts
   * the stale role inside the JWT session token. This prevents privilege escalation
   * after an admin demotes a user's role.
   */
  function requireRole(...allowedRoles: Role[]) {
    return function wrapHandler(handler: Function) {
      return async (req: Request, context?: any) => {
        const session = await sessionPort.getSession();
        if (!session?.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // VERIFY FROM DB — don't trust JWT
        const user = await lookup.findById(session.id);
        if (!user || !allowedRoles.includes(user.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return handler(req, context);
      };
    };
  }

  /**
   * Assertive version for server components / pages.
   *
   * Throws on failure so the caller can handle the error at the page level
   * (e.g. in a layout or error boundary).
   */
  async function assertRole(...allowedRoles: Role[]) {
    const session = await sessionPort.getSession();
    if (!session?.id) {
      throw new Error('AUTH_REQUIRED');
    }

    const user = await lookup.findById(session.id);
    if (!user || !allowedRoles.includes(user.role)) {
      throw new Error('FORBIDDEN');
    }

    return session;
  }

  return { requireRole, assertRole };
}
