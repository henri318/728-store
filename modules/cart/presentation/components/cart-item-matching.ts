import {
  normalizeCustomizationDraft,
  type CustomizationDraftPayload,
} from './customization-draft-schema';
import type { CartItemInfo } from './add-to-cart-types';

const hasText = (value?: string | null) => value != null && value.length > 0;

interface CustomizationFields {
  text?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
  designPosition?: Record<string, unknown> | null;
}

interface CartItem extends CustomizationFields {
  id: string;
  productId: string;
  quantity: number;
  customizations?: CustomizationFields[];
}

export function hasCustomizationContent(
  draft: CustomizationDraftPayload,
): boolean {
  return (
    hasText(draft.text) ||
    hasText(draft.color) ||
    hasText(draft.size) ||
    hasText(draft.imageUrl) ||
    Boolean(draft.designPosition)
  );
}

export function isCustomizationMatching(
  fields: CustomizationFields,
  draft: CustomizationDraftPayload | null,
): boolean {
  const normalized = normalizeCustomizationDraft(draft);
  return (
    (fields.text ?? null) === (normalized.text ?? null) &&
    (fields.color ?? null) === (normalized.color ?? null) &&
    (fields.size ?? null) === (normalized.size ?? null) &&
    (fields.imageUrl ?? null) === (normalized.imageUrl ?? null) &&
    stableSerialize(fields.designPosition ?? null) ===
      stableSerialize(normalized.designPosition ?? null)
  );
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .toSorted((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function findCartItemInfo(
  items: CartItem[],
  productId: string,
  customization: CustomizationDraftPayload,
): CartItemInfo | null {
  const found = items.find(
    (item) =>
      item.productId === productId &&
      ((item.customizations?.length ?? 0) === 0
        ? !hasCustomizationContent(customization)
        : item.customizations?.some((fields) =>
            isCustomizationMatching(fields, customization),
          )),
  );

  return found ? { cartItemId: found.id, quantity: found.quantity } : null;
}

export function findCartItemById(
  items: Array<{ id: string; quantity: number }>,
  cartItemId: string,
): CartItemInfo | null {
  const item = items.find((candidate) => candidate.id === cartItemId);
  return item ? { cartItemId: item.id, quantity: item.quantity } : null;
}
