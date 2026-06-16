import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import type { SessionPort, SessionUser } from '@/modules/auth/domain/session';

/**
 * NextAuth adapter for the SessionPort domain port.
 *
 * This is the ONLY file in the auth module that knows about NextAuth
 * internals. Authorization middleware consumes the port, not this
 * adapter directly.
 */
export class NextAuthSessionAdapter implements SessionPort {
  async getSession(): Promise<SessionUser | null> {
    const session = await getServerSession(authOptions);
    // next-auth default session.user type doesn't include `id`.
    // Our auth configuration injects it, so we use a type assertion.
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return null;
    return { id: userId };
  }
}
