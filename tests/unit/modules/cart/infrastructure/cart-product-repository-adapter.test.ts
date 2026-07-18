import { describe, expect, it, vi } from 'vitest';
import { CartProductRepositoryAdapter } from '@/modules/cart/infrastructure/cart-product-repository-adapter';
import { ProductId } from '@/shared/kernel/domain/value-objects/product-id';

describe('CartProductRepositoryAdapter', () => {
  it('delegates batch lookups to the products repository', async () => {
    const findByIds = vi.fn().mockResolvedValue([]);
    const adapter = new CartProductRepositoryAdapter({
      findByIds,
    } as never);

    await adapter.findByIds([ProductId.create('product-1')], 'cat');

    expect(findByIds).toHaveBeenCalledWith(['product-1'], 'cat');
  });
});
