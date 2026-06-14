import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/shared/infrastructure/prisma';
import { NextResponse } from 'next/server';
import { Role } from '@/shared/infrastructure/roles';

/**
 * Wraps an API route handler with role-based authorization.
 *
 * The role is **verified from the database** on every request — it never trusts
 * the stale role inside the JWT session token. This prevents privilege escalation
 * after an admin demotes a user's role.
 *
 * Usage:
 *   export const GET = requireRole('admin')(async function handler(req) { ... });
 *   export const POST = requireRole('client', 'shop')(async function handler(req) { ... });
 */
export function requireRole(...allowedRoles: Role[]) {
  return function wrapHandler(handler: Function) {
    return async (req: Request, context?: any) => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // VERIFY FROM DB — don't trust JWT
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (!user || !allowedRoles.includes(user.role as Role)) {
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
 *
 * Usage:
 *   const session = await assertRole('admin');
 *   // safe to proceed — user is admin
 */
export async function assertRole(...allowedRoles: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('AUTH_REQUIRED');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !allowedRoles.includes(user.role as Role)) {
    throw new Error('FORBIDDEN');
  }

  return session;
}
