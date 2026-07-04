import type { CheckoutGroupEntity } from './entities/checkout-group';

export interface CheckoutGroupLookupPort {
  findById(checkoutGroupId: string): Promise<CheckoutGroupEntity | null>;
}
