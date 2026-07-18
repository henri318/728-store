import type {
  CustomizationDraftPayload,
  DesignPositionPayload,
} from './customization-draft-schema';

export interface CartApiItem {
  id: string;
  productId: string;
  quantity: number;
  customizations?: Array<{
    text?: string | null;
    color?: string | null;
    size?: string | null;
    imageUrl?: string | null;
    designPosition?: DesignPositionPayload | null;
  }>;
}

export async function fetchAuthenticatedCart(): Promise<CartApiItem[] | null> {
  const response = await fetch('/api/cart');
  if (!response.ok) return null;
  const data = (await response.json()) as { items?: CartApiItem[] };
  return data.items ?? [];
}

export async function addAuthenticatedCartItem(
  productId: string,
  customization: CustomizationDraftPayload | null,
): Promise<boolean> {
  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId,
      quantity: 1,
      customizationIdList: [],
      ...(customization && { customization }),
    }),
  });
  return response.ok;
}

export async function updateAuthenticatedCartItem(
  cartItemId: string,
  body: {
    quantity: number;
    customizationIdList?: string[];
    customization?: CustomizationDraftPayload;
  },
): Promise<boolean> {
  const response = await fetch(`/api/cart/items/${cartItemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export async function removeAuthenticatedCartItem(
  cartItemId: string,
): Promise<boolean> {
  const response = await fetch(`/api/cart/items/${cartItemId}`, {
    method: 'DELETE',
  });
  return response.ok;
}
