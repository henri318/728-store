import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { CustomerNameLookupPort } from '../domain/customer-name-lookup-port';

export class CustomerNameLookupAdapter implements CustomerNameLookupPort {
  constructor(private readonly delegate: UserRepository) {}

  async findById(
    userId: string,
  ): Promise<{ firstName: string; lastName: string; email: string } | null> {
    const user = await this.delegate.findById(userId);
    if (!user) return null;
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email.value,
    };
  }
}
