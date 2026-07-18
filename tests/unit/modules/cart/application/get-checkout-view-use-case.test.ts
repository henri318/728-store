import { describe, expect, it } from 'vitest';
import { GetCartViewUseCase } from '@/modules/cart/application/get-cart-view-use-case';
import { GetCheckoutViewUseCase } from '@/modules/cart/application/get-checkout-view-use-case';
import { MemoryCartRepository } from '@/tests/doubles/memory-cart-repository';
import { MemoryCartProductRepository } from '@/tests/doubles/memory-cart-product-repository';
import { MemoryCustomizationLookup } from '@/tests/doubles/memory-customization-lookup';
import { MemoryPaidOrderCount } from '@/tests/doubles/memory-paid-order-count';
import { CartStatus } from '@/modules/cart/domain/value-objects/cart-status';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';
import { SellerId } from '@/shared/kernel/domain/value-objects/seller-id';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ValidationError } from '@/shared/kernel/app-error';

describe('GetCheckoutViewUseCase', () => {
  it('returns zero shipping and total for an empty cart', async () => {
    const cartRepository = new MemoryCartRepository();
    await cartRepository.save({
      id: 'cart-1',
      userId: 'user-1',
      status: CartStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });
    const cartView = new GetCartViewUseCase(
      cartRepository,
      new MemoryCartProductRepository(),
      new MemoryCustomizationLookup(),
    );

    await expect(
      new GetCheckoutViewUseCase(cartView, new MemoryPaidOrderCount()).execute({
        userId: 'user-1',
        locale: 'es',
        unknownProductName: 'Unknown Product',
        unknownSellerName: 'Unknown Seller',
      }),
    ).resolves.toMatchObject({
      items: [],
      shipping: 0,
      total: 0,
    });
  });

  it('rejects carts with mixed currencies', async () => {
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
          productId: ProductId.create('product-1'),
          sellerId: SellerId.create('seller-1'),
          quantity: 1,
          unitPriceSnapshot: Money.create(10, Currency.EUR),
          customizationIdList: [],
        },
        {
          id: 'item-2',
          cartId: 'cart-1',
          productId: ProductId.create('product-2'),
          sellerId: SellerId.create('seller-1'),
          quantity: 1,
          unitPriceSnapshot: Money.create(10, Currency.USD),
          customizationIdList: [],
        },
      ],
    });
    const cartView = new GetCartViewUseCase(
      cartRepository,
      new MemoryCartProductRepository(),
      new MemoryCustomizationLookup(),
    );

    await expect(
      new GetCheckoutViewUseCase(cartView, new MemoryPaidOrderCount()).execute({
        userId: 'user-1',
        locale: 'es',
        unknownProductName: 'Unknown Product',
        unknownSellerName: 'Unknown Seller',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('groups the cart by seller and applies the first-purchase discount', async () => {
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
          unitPriceSnapshot: Money.create(10, Currency.EUR),
          customizationIdList: [],
        },
      ],
    });
    productRepository.seed([
      {
        id: 'product-1',
        basePrice: 10,
        sellerId: 'seller-1',
        displayName: 'Mug',
        sellerName: 'Shop',
      },
    ]);
    const paidOrderCount = new MemoryPaidOrderCount();
    paidOrderCount.setCount(0);
    const cartView = new GetCartViewUseCase(
      cartRepository,
      productRepository,
      customizationLookup,
    );

    const result = await new GetCheckoutViewUseCase(
      cartView,
      paidOrderCount,
    ).execute({
      userId: 'user-1',
      locale: 'es',
      unknownProductName: 'Unknown Product',
      unknownSellerName: 'Unknown Seller',
    });

    expect(result).toMatchObject({
      currency: Currency.EUR,
      subtotal: 20,
      discount: 2,
      shipping: 3.99,
      total: 21.99,
      isFirstPurchase: true,
      sellerGroups: [
        expect.objectContaining({ sellerId: 'seller-1', subtotal: 20 }),
      ],
    });
  });

  it('does not discount repeat buyers', async () => {
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
          productId: ProductId.create('product-1'),
          sellerId: SellerId.create('seller-1'),
          quantity: 2,
          unitPriceSnapshot: Money.create(10, Currency.EUR),
          customizationIdList: [],
        },
      ],
    });
    const paidOrderCount = new MemoryPaidOrderCount();
    paidOrderCount.setCount(1);
    const cartView = new GetCartViewUseCase(
      cartRepository,
      new MemoryCartProductRepository(),
      new MemoryCustomizationLookup(),
    );

    await expect(
      new GetCheckoutViewUseCase(cartView, paidOrderCount).execute({
        userId: 'user-1',
        locale: 'es',
        unknownProductName: 'Unknown Product',
        unknownSellerName: 'Unknown Seller',
      }),
    ).resolves.toMatchObject({
      subtotal: 20,
      discount: 0,
      total: 23.99,
      isFirstPurchase: false,
    });
  });
});
