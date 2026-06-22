import type { RoleId } from '@/shared/kernel/domain/identifiers/role-id';

/**
 * Role entity — represents a user role in the authorization system.
 *
 * Each role has a unique id (RoleId value object), a unique name
 * (ADMIN | SUPPORT | DESIGNER | CUSTOMER), and a human-readable description.
 */
export interface RoleEntity {
  readonly id: RoleId;
  readonly name: string;
  readonly description: string;
}
