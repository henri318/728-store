import type { UserEntity } from './user-repository';
import type { UserAddressInput } from './user-address';

export interface UserProfilePort {
  findById(userId: string): Promise<UserEntity | null>;
  findAddressByUserId(userId: string): Promise<UserAddressInput | null>;
}
