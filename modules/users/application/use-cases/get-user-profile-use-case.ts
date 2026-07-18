import type { UserProfilePort } from '../../domain/user-profile-port';

export class GetUserProfileUseCase {
  constructor(private readonly profilePort: UserProfilePort) {}

  async execute(userId: string) {
    const user = await this.profilePort.findById(userId);
    if (!user) return null;

    const deliveryAddress = await this.profilePort.findAddressByUserId(userId);
    return { ...user, deliveryAddress };
  }
}
