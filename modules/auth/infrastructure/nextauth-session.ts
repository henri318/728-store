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
    if (!session?.user?.id) return null;
    return { id: session.user.id };
  }
}
