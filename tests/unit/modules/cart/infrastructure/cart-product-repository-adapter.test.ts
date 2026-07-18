import { describe, expect, it, vi } from 'vitest';
import { CartProductRepositoryAdapter } from '@/modules/cart/infrastructure/cart-product-repository-adapter';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

describe('CartProductRepositoryAdapter', () => {
  it('delegates batch lookups to the products repository', async () => {
    const findByIds = vi.fn().mockResolvedValue([
      {
        id: 'product-1',
        basePrice: 12.5,
        currency: Currency.EUR,
        sellerId: 'seller-1',
        displayName: 'Tassa',
        sellerName: 'Botiga',
        imageUrl: '/tassa.jpg',
        images: [{ alt: 'Vermell', url: '/tassa-vermella.jpg' }],
      },
    ]);
    const adapter = new CartProductRepositoryAdapter({
      findByIds,
    } as never);

    const result = await adapter.findByIds(
      [ProductId.create('product-1')],
      'cat',
    );

    expect(findByIds).toHaveBeenCalledWith(['product-1'], 'cat');
    expect(result.get('product-1')).toMatchObject({
      displayName: 'Tassa',
      sellerName: 'Botiga',
      imageUrl: '/tassa.jpg',
      images: [{ alt: 'Vermell', url: '/tassa-vermella.jpg' }],
    });
  });
});
