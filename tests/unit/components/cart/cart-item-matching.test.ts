import { describe, expect, it } from 'vitest';
import {
  findCartItemInfo,
  isCustomizationMatching,
} from '@/modules/cart/presentation/components/cart-item-matching';

const designPosition = {
  imageUrl: 'https://example.com/design.png',
  x: 0.25,
  y: 0.5,
  scale: 100,
  rotation_deg: 0,
  opacity: 100,
  blend_mode: 'source-over' as const,
};

describe('cart item matching', () => {
  it('matches design positions regardless of property order', () => {
    expect(
      isCustomizationMatching(
        {
          text: 'Design',
          designPosition: {
            opacity: 100,
            blend_mode: 'source-over',
            x: 0.25,
            imageUrl: 'https://example.com/design.png',
            rotation_deg: 0,
            scale: 100,
            y: 0.5,
          },
        },
        { text: 'Design', designPosition },
      ),
    ).toBe(true);
  });

  it('does not match customizations with different design positions', () => {
    expect(
      findCartItemInfo(
        [
          {
            id: 'cart-item-1',
            productId: 'product-1',
            quantity: 1,
            customizations: [
              { text: 'Design', designPosition: { ...designPosition, x: 0.3 } },
            ],
          },
        ],
        'product-1',
        { text: 'Design', designPosition },
      ),
    ).toBeNull();
  });
});
