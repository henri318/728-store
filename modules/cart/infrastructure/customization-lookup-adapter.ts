import type { CustomizationRepository } from '@/modules/customizations/domain/customization-repository';
import type {
  CustomizationDesignPositionSnapshot,
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
    return entities.map(toSnapshot);
  }

  async findByProductId(productId: string): Promise<CustomizationSnapshot[]> {
    const entities = await this.delegate.findByProductId(productId);
    return entities.map(toSnapshot);
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

function toDesignPositionSnapshot(
  value: unknown,
): CustomizationDesignPositionSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.imageUrl !== 'string' ||
    candidate.imageUrl.length === 0
  ) {
    return null;
  }
  return {
    imageUrl: candidate.imageUrl,
    x: typeof candidate.x === 'number' ? candidate.x : 0.5,
    y: typeof candidate.y === 'number' ? candidate.y : 0.5,
    scale: typeof candidate.scale === 'number' ? candidate.scale : 100,
    rotation_deg:
      typeof candidate.rotation_deg === 'number' ? candidate.rotation_deg : 0,
    opacity: typeof candidate.opacity === 'number' ? candidate.opacity : 100,
    blend_mode:
      typeof candidate.blend_mode === 'string'
        ? candidate.blend_mode
        : 'source-over',
  };
}
