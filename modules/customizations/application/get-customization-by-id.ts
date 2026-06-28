import type { CustomizationRepository } from '../domain/customization-repository';
import type { CustomizationEntity } from '../domain/entities/customization';

export interface GetCustomizationByIdDTO {
  id: string;
}

/**
 * GetCustomizationByIdUseCase — returns entity or null.
 */
export class GetCustomizationById {
  constructor(private repo: CustomizationRepository) {}

  async execute(
    dto: GetCustomizationByIdDTO,
  ): Promise<CustomizationEntity | null> {
    return this.repo.findById(dto.id);
  }
}
