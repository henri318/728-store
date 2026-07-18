import { describe, expect, it } from 'vitest';
import { GetCartViewUseCase } from '@/modules/cart/application/get-cart-view-use-case';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { MemoryCartProductRepository } from '@/tests/doubles/memory-cart-product-repository';
import { MemoryCustomizationLookup } from '@/tests/doubles/memory-customization-lookup';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

describe('GetCartViewUseCase', () => {
  it('loads cart items with localized product data and customizations', async () => {
    const cartRepository = new MemoryCartRepository();
    const productRepository = new MemoryCartProductRepository();
    const customizationLookup = new MemoryCustomizationLookup();
    await cartRepository.save({
      id: 'cart-1',
      userId: 'user-1',
      status: CartStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: ProductId.create('product-1'),
          sellerId: SellerId.create('seller-1'),
          quantity: 2,
          unitPriceSnapshot: Money.create(12.5, Currency.EUR),
          customizationIdList: ['customization-1'],
        },
      ],
    });
    productRepository.seed([
      {
        id: 'product-1',
        basePrice: 12.5,
        sellerId: 'seller-1',
        displayName: 'Tassa',
        sellerName: 'Botiga',
        imageUrl: '/tassa.jpg',
        images: [{ alt: 'Vermell', url: '/tassa-vermella.jpg' }],
      },
    ]);
    customizationLookup.seed([
      {
        id: 'customization-1',
        productId: 'product-1',
        text: 'Hola',
        color: 'Vermell',
      },
    ]);

    const result = await new GetCartViewUseCase(
      cartRepository,
      productRepository,
      customizationLookup,
    ).execute({
      userId: 'user-1',
      locale: 'cat',
      unknownProductName: 'Producte desconegut',
      unknownSellerName: 'Venedor desconegut',
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        productName: 'Tassa',
        productImageUrl: '/tassa.jpg',
        sellerName: 'Botiga',
        lineTotal: 25,
        customization: expect.objectContaining({
          text: 'Hola',
          colorImageUrl: '/tassa-vermella.jpg',
        }),
        customizations: [expect.objectContaining({ id: 'customization-1' })],
      }),
    ]);
  });

  it('flags deleted customizations and uses provided display fallbacks', async () => {
    const cartRepository = new MemoryCartRepository();
    await cartRepository.save({
      id: 'cart-1',
      userId: 'user-1',
      status: CartStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: ProductId.create('missing-product'),
          sellerId: SellerId.create('seller-1'),
          quantity: 1,
          unitPriceSnapshot: Money.create(12.5, Currency.EUR),
          customizationIdList: ['missing-customization'],
        },
      ],
    });

    const result = await new GetCartViewUseCase(
      cartRepository,
      new MemoryCartProductRepository(),
      new MemoryCustomizationLookup(),
    ).execute({
      userId: 'user-1',
      locale: 'es',
      unknownProductName: 'Unknown Product',
      unknownSellerName: 'Unknown Seller',
    });

    expect(result.items[0]).toMatchObject({
      productName: 'Unknown Product',
      sellerName: 'Unknown Seller',
      hasMissingCustomizations: true,
      customizations: [],
    });
  });
});
