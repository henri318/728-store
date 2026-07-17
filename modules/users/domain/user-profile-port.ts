import type { UserEntity } from './user-repository';

export interface UserProfilePort {
  findById(userId: string): Promise<UserEntity | null>;
}
