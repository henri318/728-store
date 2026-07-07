import type { CustomizationRepository } from '@/modules/customizations/domain/customization-repository';
import { coerceDesignPosition } from '@/shared/kernel/domain/value-objects/design-position';
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
    return entities.map((e) => toSnapshot(e));
  }

  async findByProductId(productId: string): Promise<CustomizationSnapshot[]> {
    const entities = await this.delegate.findByProductId(productId);
    return entities.map((e) => toSnapshot(e));
  }
}

function toSnapshot(entity: {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  designPosition: unknown;
}): CustomizationSnapshot {
  return {
    id: entity.id,
    productId: entity.productId,
    text: entity.text,
    color: entity.color,
    size: entity.size,
    imageUrl: entity.imageUrl,
    designPosition: toDesignPositionSnapshot(entity.designPosition),
  };
}

function toDesignPositionSnapshot(value: unknown) {
  return coerceDesignPosition(value);
}
