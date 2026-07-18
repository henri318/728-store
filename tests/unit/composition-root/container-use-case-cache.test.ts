import { describe, expect, it } from 'vitest';
import { container } from '@/composition-root/container';

describe('container use-case caches', () => {
  it('rebuilds product use cases after replacing the product repository', () => {
    container.setProductRepository({} as never);
    const previous = container.getProductByIdUseCase();

    container.setProductRepository({} as never);

    expect(container.getProductByIdUseCase()).not.toBe(previous);
  });

  it('rebuilds the cart view after replacing the cart repository', () => {
    container.setCartProductRepository({} as never);
    container.setCustomizationLookup({} as never);
    container.setCartRepository({} as never);
    const previous = container.getCartViewUseCase();

    container.setCartRepository({} as never);

    expect(container.getCartViewUseCase()).not.toBe(previous);
  });
});
