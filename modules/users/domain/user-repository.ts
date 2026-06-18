import type { UserEntity } from './entities/user';

export type { UserEntity };

export interface UserRepository {
  save(user: UserEntity, tx?: any): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  markEmailVerified(userId: string): Promise<void>;
}
