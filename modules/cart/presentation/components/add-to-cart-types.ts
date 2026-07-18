import type { CustomizationDraftPayload } from './customization-draft-schema';

export interface CartButtonLabels {
  addToCart: string;
  removeFromCart: string;
  adding: string;
  added: string;
  error: string;
  customizeProduct?: string;
  addWithoutCustomization?: string;
  customizationChoiceBadge?: string;
  customizationChoiceTitle?: string;
  customizationChoiceMessage?: string;
  decreaseQuantity?: string;
  increaseQuantity?: string;
  saveDesign?: string;
  savingDesign?: string;
  addAnotherPersonalization?: string;
  alreadyInCart?: string;
}

export interface AddToCartButtonProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  imageUrl?: string | null;
  customization?: CustomizationDraftPayload | null;
  customizationAvailable?: boolean;
  customizeHref?: string;
  disabled?: boolean;
  editCartItemId?: string;
  labels: CartButtonLabels;
}

export interface CartItemInfo {
  cartItemId: string;
  quantity: number;
}

export type ButtonState = 'idle' | 'adding' | 'success' | 'error';
