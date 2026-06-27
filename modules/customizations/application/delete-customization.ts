import type { CustomizationRepository } from '../domain/customization-repository';
import {
  CustomizationNotFoundError,
  CustomizationInUseError,
} from '../domain/errors';

export interface DeleteCustomizationDTO {
  id: string;
}

/**
 * DeleteCustomizationUseCase — rejects if referenced by any
 * OrderLineItem.customizationIdList. Spec REQ-CUST-03.
 */
export class DeleteCustomization {
  constructor(private repo: CustomizationRepository) {}

  async execute(dto: DeleteCustomizationDTO): Promise<void> {
    const existing = await this.repo.findById(dto.id);
    if (!existing) {
      throw new CustomizationNotFoundError(`Customization ${dto.id} not found`);
    }

    const inUse = await this.repo.isReferencedByOrders(dto.id);
    if (inUse) {
      throw new CustomizationInUseError();
    }

    await this.repo.delete(dto.id);
  }
}
