import type { CustomizationRepository } from '../domain/customization-repository';
import {
  CustomizationNotFoundError,
  CustomizationInUseError,
  CustomizationForbiddenError,
} from '../domain/errors';

export interface DeleteCustomizationDTO {
  id: string;
  sellerId: string; // Caller must provide seller context for ownership validation
}

/**
 * Product ownership check — injected to avoid direct module coupling.
 * Returns the sellerId that owns the product associated with a customization.
 */
export interface ProductOwnershipPort {
  getSellerIdForCustomization(customizationId: string): Promise<string | null>;
}

/**
 * DeleteCustomizationUseCase — validates ownership, rejects if referenced by any
 * OrderLineItem.customizationIdList. Spec REQ-CUST-03.
 */
export class DeleteCustomization {
  constructor(
    private repo: CustomizationRepository,
    private productOwnership: ProductOwnershipPort,
  ) {}

  async execute(dto: DeleteCustomizationDTO): Promise<void> {
    const existing = await this.repo.findById(dto.id);
    if (!existing) {
      throw new CustomizationNotFoundError(`Customization ${dto.id} not found`);
    }

    // Validate ownership: customization's product must belong to the caller's seller
    const ownerSellerId =
      await this.productOwnership.getSellerIdForCustomization(dto.id);
    if (ownerSellerId !== dto.sellerId) {
      throw new CustomizationForbiddenError();
    }

    const inUse = await this.repo.isReferencedByOrders(dto.id);
    if (inUse) {
      throw new CustomizationInUseError();
    }

    await this.repo.delete(dto.id);
  }
}
