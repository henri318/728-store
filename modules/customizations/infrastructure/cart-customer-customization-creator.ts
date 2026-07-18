import type { CustomerCustomizationCreatePort } from '@/modules/cart/domain/customer-customization-create-port';
import { CreateCustomerCustomization } from '../application/create-customer-customization';
import type { CustomizationRepository } from '../domain/customization-repository';
import type { ProductCapabilityPort } from '@/modules/products/domain/product-capability-port';

/** Bridges Cart's creation port to the Customizations application service. */
export class CartCustomerCustomizationCreator implements CustomerCustomizationCreatePort {
  constructor(
    private readonly repository: CustomizationRepository,
    private readonly productCapability: ProductCapabilityPort,
  ) {}

  async create(
    input: Parameters<CustomerCustomizationCreatePort['create']>[0],
    userId: string,
    tx?: unknown,
  ) {
    return new CreateCustomerCustomization(
      this.repository,
      this.productCapability,
    ).execute(input, userId, tx);
  }
}
