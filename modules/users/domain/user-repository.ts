import type { UserEntity } from './entities/user';

export type { UserEntity };

export interface UserRepository {
  save(user: UserEntity, tx?: unknown): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  markEmailVerified(userId: string): Promise<void>;
  update(user: UserEntity, tx?: unknown): Promise<UserEntity>;
  /** @deprecated Use soft-delete via `update()` with `deletedAt` set instead. */
  delete(id: string): Promise<void>;
}
