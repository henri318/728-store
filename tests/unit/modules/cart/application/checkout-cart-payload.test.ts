import { describe, it, expectTypeOf } from 'vitest';
import type { CartCheckedOutPayload } from '@/modules/orders/application/handle-cart-checked-out';

describe('CartCheckedOutPayload', () => {
  it('keeps customizationIdList on each checked-out cart item', () => {
    expectTypeOf<
      CartCheckedOutPayload['items'][number]['customizationIdList']
    >().toEqualTypeOf<string[] | undefined>();
  });
});
