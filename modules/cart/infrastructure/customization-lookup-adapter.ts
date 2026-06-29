import type { CustomizationRepository } from '@/modules/customizations/domain/customization-repository';
import type {
  CustomizationLookupPort,
  CustomizationSnapshot,
} from '../domain/customization-lookup-port';

/**
 * Adapter — bridges cart's CustomizationLookupPort to the real
 * customizations infrastructure. The ONLY place in the cart module
 * that touches the customizations module.
 *
 * The customizations repository is injected via constructor so the
 * adapter stays testable and free of infrastructure imports.
 */
export class CustomizationLookupAdapter implements CustomizationLookupPort {
  constructor(private readonly delegate: CustomizationRepository) {}

  async findByIds(ids: string[]): Promise<CustomizationSnapshot[]> {
    if (ids.length === 0) return [];

    const entities = await this.delegate.findByIds(ids);
    return entities.map((entity) => ({
      id: entity.id,
      productId: entity.productId,
      text: entity.text,
      color: entity.color,
      size: entity.size,
      imageUrl: entity.imageUrl,
    }));
  }

  async findByProductId(productId: string): Promise<CustomizationSnapshot[]> {
    const entities = await this.delegate.findByProductId(productId);
    return entities.map((entity) => ({
      id: entity.id,
      productId: entity.productId,
      text: entity.text,
      color: entity.color,
      size: entity.size,
      imageUrl: entity.imageUrl,
    }));
  }
}
