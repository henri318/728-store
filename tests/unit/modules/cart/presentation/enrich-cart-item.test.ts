import { describe, expect, it } from 'vitest';
import { enrichCartItem } from '@/modules/cart/presentation/enrich-cart-item';

const item = {
  id: 'item-1',
  cartId: 'cart-1',
  productId: { value: 'product-1' },
  sellerId: { value: 'seller-1' },
  quantity: 1,
  unitPriceSnapshot: { amount: 12 },
  customizationIdList: [],
} as never;

describe('enrichCartItem', () => {
  it('uses the requested locale even when translations are returned in another order', () => {
    const result = enrichCartItem(
      item,
      {
        translations: [
          { locale: 'es', name: 'Vela española', description: null },
          { locale: 'cat', name: 'Vela catalana', description: null },
        ],
      } as never,
      [],
      'cat',
    );

    expect(result.productName).toBe('Vela catalana');
  });

  it('preserves the neutral Spanish fallback for API callers without a request locale', () => {
    const result = enrichCartItem(
      item,
      {
        translations: [
          { locale: 'cat', name: 'Vela catalana', description: null },
          { locale: 'es', name: 'Vela española', description: null },
        ],
      } as never,
      [],
      'es',
    );

    expect(result.productName).toBe('Vela española');
  });
});
