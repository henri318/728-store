import { describe, it, expect } from 'vitest';
import { ProductEvents } from '@/modules/products/domain/product-events';
import { SellerEvents } from '@/modules/sellers/domain/seller-events';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

type EventModule = {
  name: string;
  events: Record<string, string>;
  prefix: string;
};

const modules: EventModule[] = [
  { name: 'ProductEvents', events: ProductEvents, prefix: 'PRODUCT' },
  { name: 'SellerEvents', events: SellerEvents, prefix: 'SELLER' },
];

describe.each(modules)('$name', ({ events, prefix }) => {
  const entries = Object.entries(events);

  describe('event values and GlobalEvents registration', () => {
    it.each(entries)('%s = %s → registered in GlobalEvents', (key, value) => {
      expect(key).toMatch(new RegExp(`^${prefix}_`));
      expect(GlobalEvents).toHaveProperty(key);
      expect(GlobalEvents[key as keyof typeof GlobalEvents]).toBe(value);
    });
  });
});
