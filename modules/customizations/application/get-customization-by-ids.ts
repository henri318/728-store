import type { CustomizationRepository } from '../domain/customization-repository';
import type { CustomizationEntity } from '../domain/entities/customization';

export interface GetCustomizationByIdsDTO {
  ids: string[];
}

/**
 * GetCustomizationByIdsUseCase — batched lookup, returns Map keyed by id.
 *
 * Missing IDs are silently absent from the result (spec REQ-CUST-02).
 */
export class GetCustomizationByIds {
  constructor(private repo: CustomizationRepository) {}

  async execute(
    dto: GetCustomizationByIdsDTO,
  ): Promise<Map<string, CustomizationEntity>> {
    if (dto.ids.length === 0) return new Map();

    const entities = await this.repo.findByIds(dto.ids);
    const map = new Map<string, CustomizationEntity>();
    for (const entity of entities) {
      map.set(entity.id, entity);
    }
    return map;
  }
}
