import type { CustomerNameLookupPort } from '@/modules/orders/domain/customer-name-lookup-port';

export class MemoryCustomerNameLookup implements CustomerNameLookupPort {
  private users: Map<
    string,
    { firstName: string; lastName: string; email: string }
  > = new Map();

  seed(
    userId: string,
    firstName: string,
    lastName: string,
    email?: string,
  ): void {
    this.users.set(userId, {
      firstName,
      lastName,
      email:
        email ??
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
    });
  }

  async findById(
    userId: string,
  ): Promise<{ firstName: string; lastName: string; email: string } | null> {
    return this.users.get(userId) ?? null;
  }
}
