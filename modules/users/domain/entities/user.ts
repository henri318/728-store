import type { UserId } from '@/shared/kernel/domain/value-objects/user-id';
import type { Email } from '@/shared/kernel/domain/value-objects/email';
import type { Address } from '@/shared/kernel/domain/value-objects/address';
import type { RoleId } from '@/modules/roles/domain/value-objects/role-id';
import type { PasswordHash } from '@/shared/kernel/domain/value-objects/password-hash';

/**
 * UserEntity — a pure data interface representing a user in the system.
 *
 * All identity and scalar types are Value Objects (UserId, Email, etc.)
 * to enforce domain invariants at construction time and prevent
 * primitive-obsession bugs (string-based confusion between id/email/role).
 *
 * Follows the existing codebase pattern: plain interface, no class,
 * no private constructor. VOs are validated at use-case boundaries.
 */
export interface UserEntity {
  readonly userId: UserId;
  readonly email: Email;
  readonly firstName: string;
  readonly lastName: string;
  readonly address: Address | null;
  readonly roleId: RoleId;
  readonly passwordHash: PasswordHash;
  readonly emailVerified: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
