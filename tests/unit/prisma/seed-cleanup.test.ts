import { describe, expect, it, vi } from 'vitest';
import {
  clearExistingData,
  type SeedCleanupClient,
} from '../../../prisma/seed-cleanup';

describe('clearExistingData', () => {
  it('deletes child records before their restricted parents', async () => {
    const calls: string[] = [];
    const delegate = (name: string) => ({
      deleteMany: vi.fn(async () => {
        calls.push(name);
        return { count: 0 };
      }),
    });
    const client = {
      productTranslation: delegate('productTranslation'),
      customization: delegate('customization'),
      searchHistory: delegate('searchHistory'),
      signupAttempt: delegate('signupAttempt'),
      loginAttempt: delegate('loginAttempt'),
      orderLineItem: delegate('orderLineItem'),
      order: delegate('order'),
      checkoutGroup: delegate('checkoutGroup'),
      cart: delegate('cart'),
      outboxEvent: delegate('outboxEvent'),
      emailQueue: delegate('emailQueue'),
      product: delegate('product'),
      category: delegate('category'),
      seller: delegate('seller'),
      user: delegate('user'),
      role: delegate('role'),
    } as unknown as SeedCleanupClient;

    await clearExistingData(client);

    expect(calls).toEqual([
      'productTranslation',
      'customization',
      'searchHistory',
      'signupAttempt',
      'loginAttempt',
      'orderLineItem',
      'order',
      'checkoutGroup',
      'cart',
      'outboxEvent',
      'emailQueue',
      'product',
      'category',
      'seller',
      'user',
      'role',
    ]);
  });
});
