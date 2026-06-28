import type {
  CustomizationLookupPort,
  CustomizationLookupSnapshot,
} from '@/modules/orders/domain/customization-lookup-port';

/**
 * In-memory CustomizationLookupPort test double for orders specs.
 *
 * Keeps the orders tests decoupled from the cart module's test double/type
 * while preserving the same lookup semantics: missing IDs are silently
 * ignored and existing customizations are returned as frozen snapshots.
 */
export class MemoryOrderCustomizationLookup implements CustomizationLookupPort {
  private customizations: Map<string, CustomizationLookupSnapshot> = new Map();

  async findByIds(ids: string[]): Promise<CustomizationLookupSnapshot[]> {
    const result: CustomizationLookupSnapshot[] = [];
    for (const id of ids) {
      const snapshot = this.customizations.get(id);
      if (snapshot) result.push({ ...snapshot });
    }
    return result;
  }

  seed(
    customizations: Array<{
      id: string;
      productId: string;
      text?: string | null;
      color?: string | null;
      size?: string | null;
      imageUrl?: string | null;
    }>,
  ): void {
    for (const c of customizations) {
      this.customizations.set(c.id, {
        id: c.id,
        productId: c.productId,
        text: c.text ?? null,
        color: c.color ?? null,
        size: c.size ?? null,
        imageUrl: c.imageUrl ?? null,
      });
    }
  }

  clear(): void {
    this.customizations.clear();
  }
}
