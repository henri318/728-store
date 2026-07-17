import type { CustomerNameLookupPort } from '@/modules/orders/domain/customer-name-lookup-port';

export class MemoryCustomerNameLookup implements CustomerNameLookupPort {
  private users: Map<string, { firstName: string; lastName: string }> =
    new Map();

  seed(userId: string, firstName: string, lastName: string): void {
    this.users.set(userId, { firstName, lastName });
  }

  async findById(
    userId: string,
  ): Promise<{ firstName: string; lastName: string } | null> {
    return this.users.get(userId) ?? null;
  }
}
