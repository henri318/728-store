import type { SessionPort, SessionUser } from '@/modules/auth/domain/session';

/**
 * In-memory SessionPort test double.
 *
 * Tests can set the session via `setSession()` to simulate authenticated
 * or unauthenticated states without touching NextAuth or JWT cookies.
 */
export class MemorySession implements SessionPort {
  private user: SessionUser | null = null;

  async getSession(): Promise<SessionUser | null> {
    return this.user;
  }

  /** Test helper — simulate an authenticated session. */
  setSession(userId: string): void {
    this.user = { id: userId };
  }

  /** Test helper — simulate no session (unauthenticated). */
  clearSession(): void {
    this.user = null;
  }
}
