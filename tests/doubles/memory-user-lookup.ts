import type {
  UserLookupPort,
  UserLookupResult,
} from '@/modules/auth/domain/user-lookup';
import type { Role } from '@/modules/auth/domain/roles';

/**
 * In-memory UserLookupPort test double.
 *
 * Stores user records in a Map keyed by id. Tests can `seed()` entries to
 * simulate the database.
 *
 * This is the ONLY place in the test suite that should construct one of
 * these — production wires the Prisma adapter.
 */
export class MemoryUserLookup implements UserLookupPort {
  private users = new Map<string, UserLookupResult>();

  async findById(userId: string): Promise<UserLookupResult | null> {
    return this.users.get(userId) ?? null;
  }

  /** Test helper — populate the in-memory store. */
  seed(record: { id: string; role: Role }): void {
    this.users.set(record.id, { id: record.id, role: record.role });
  }
}
