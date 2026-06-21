import type { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import type { SellerStatus } from './seller-status';

export { SellerStatus } from './seller-status';

/**
 * SellerEntity — a pure data interface representing a seller in the system.
 *
 * Follows the existing codebase pattern (UserEntity): plain interface, no class.
 * Value objects are validated at use-case boundaries.
 *
 * Fields:
 *  - sellerId: unique identifier (value object)
 *  - name: display name, unique across all sellers
 *  - description: optional marketing description
 *  - userId: FK to User (1:1 link), required — every seller must have a linked user
 *  - status: lifecycle state (active | suspended | banned)
 *  - deletedAt: soft-delete timestamp, null means active
 *  - createdAt / updatedAt: standard timestamps
 */
export interface SellerEntity {
  readonly sellerId: SellerId;
  readonly name: string;
  readonly description: string | null;
  readonly userId: string;
  readonly status: SellerStatus;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
