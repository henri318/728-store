export const CART_UPDATED_EVENT = 'cart:updated';

export function dispatchCartUpdated(): void {
  globalThis.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
