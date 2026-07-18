import type { UserEntity } from './entities/user';
import type { UserAddressInput } from './user-address';

export interface UserRepository {
  save(user: UserEntity, tx?: unknown): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findAddressByUserId(userId: string): Promise<UserAddressInput | null>;
  saveAddress(userId: string, address: UserAddressInput): Promise<void>;
  clearAddress(userId: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  update(user: UserEntity, tx?: unknown): Promise<UserEntity>;
  /** @deprecated Use soft-delete via `update()` with `deletedAt` set instead. */
  delete(id: string): Promise<void>;
}

export { type UserEntity } from './entities/user';
