import type { Role } from './roles';

/**
 * UserLookupPort — the port for fetching a minimal user record used by
 * authorization middleware.
 *
 * Lives in the auth module's domain layer. Does NOT depend on Prisma or
 * any concrete adapter — the Prisma adapter lives in auth/infrastructure,
 * the memory double in tests/doubles.
 *
 * Why a separate port (instead of reusing UserRepository):
 *  - Authorization only needs {id, role} — narrower surface
 *  - The use case is "is the session user allowed to do X?" — not domain logic
 *  - It avoids coupling auth to the full UserEntity shape
 */
export interface UserLookupResult {
  id: string;
  role: Role;
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserLookupResult | null>;
}
