import type { SessionUser } from './entities/session-user';

export type { SessionUser };

/**
 * SessionPort — the port for retrieving the current user's session.
 *
 * Architecture:
 *   Authorization proxy  →  sessionPort.getSession()  (this port)
 *   Concrete adapter          →  NextAuth / JWT / custom auth
 *
 * Lives in the auth module's domain layer.
 *
 * Why a separate port (instead of calling getServerSession directly):
 *  - Eliminates the infrastructure → app/ cycle (authorization imported authOptions)
 *  - Makes authorization testable with a memory double
 *  - Keeps NextAuth as a replaceable detail, not a structural dependency
 */
export interface SessionPort {
  /**
   * Return the current session user, or null if not authenticated.
   * The implementation is responsible for validating the JWT / cookie.
   */
  getSession(): Promise<SessionUser | null>;
}
