import type { UserProfilePort } from '../domain/user-profile-port';
import type { UserRepository } from '../domain/user-repository';

export class UserProfileAdapter implements UserProfilePort {
  constructor(private readonly userRepository: UserRepository) {}

  findById(userId: string) {
    return this.userRepository.findById(userId);
  }

  findAddressByUserId(userId: string) {
    return this.userRepository.findAddressByUserId(userId);
  }
}
