import type {
  CustomizationLookupPort,
  CustomizationSnapshot,
} from '@/modules/cart/domain/customization-lookup-port';

/**
 * In-memory CustomizationLookupPort test double.
 *
 * Tests seed customizations in plain-JSON form and the double returns
 * snapshots for the IDs that exist (missing IDs are silently absent,
 * matching the real adapter's contract).
 */
export class MemoryCustomizationLookup implements CustomizationLookupPort {
  private customizations: Map<string, CustomizationSnapshot> = new Map();

  async findByIds(ids: string[]): Promise<CustomizationSnapshot[]> {
    const result: CustomizationSnapshot[] = [];
    for (const id of ids) {
      const snapshot = this.customizations.get(id);
      if (snapshot) result.push({ ...snapshot });
    }
    return result;
  }

  /** Seed customizations in plain-JSON form for readability in tests. */
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

  /** Test helper — clear all stored customizations between tests. */
  clear(): void {
    this.customizations.clear();
  }
}
