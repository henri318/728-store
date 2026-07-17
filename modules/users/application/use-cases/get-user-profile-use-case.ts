import type { UserProfilePort } from '../../domain/user-profile-port';

export class GetUserProfileUseCase {
  constructor(private readonly profilePort: UserProfilePort) {}

  execute(userId: string) {
    return this.profilePort.findById(userId);
  }
}
