import type { GuestCartItem } from './guest-cart-context';

export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customization: {
    text: string | null;
    color: string | null;
    size: string | null;
    imageUrl: string | null;
    imageUploadId?: string | null;
    colorImageUrl?: string | null;
    designPosition?: {
      imageUrl: string;
      x: number;
      y: number;
      scale: number;
      rotation_deg: number;
      opacity: number;
      blend_mode: string;
    } | null;
  };
}

export function guestItemToDTO(
  item: GuestCartItem,
  fallback: { productName: string; sellerName: string },
): CartItemDTO {
  return {
    id: item.id ?? item.productId,
    productId: item.productId,
    productName: item.productName ?? fallback.productName,
    productImageUrl: item.productImageUrl ?? null,
    sellerId: item.sellerId,
    sellerName: item.sellerName ?? fallback.sellerName,
    quantity: item.quantity,
    unitPrice: item.unitPriceSnapshot,
    lineTotal: +(item.unitPriceSnapshot * item.quantity).toFixed(2),
    customization: {
      text: item.customizationText ?? null,
      color: item.customizationColor ?? null,
      size: item.customizationSize ?? null,
      imageUrl: item.customizationImageUrl ?? null,
      imageUploadId: item.customizationImageUploadId ?? null,
      colorImageUrl: item.productImageUrl ?? null,
      designPosition: item.customizationDesignPosition ?? null,
    },
  };
}
