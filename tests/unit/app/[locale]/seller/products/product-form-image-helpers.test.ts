import { describe, expect, it } from 'vitest';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { normalizeInitialImages } from '@/app/[locale]/seller/products/product-form-image-helpers';

describe('normalizeInitialImages', () => {
  it('uses the bucket purpose instead of conflicting seed metadata', () => {
    const images = normalizeInitialImages(
      { gallery: { defaultPhotoName: 'Photo' } } as never,
      {
        cover: null,
        showcase: [],
        customizableBase: [
          {
            id: 'base-1',
            url: 'https://cdn.example.com/base.png',
            alt: 'Base',
            purpose: ProductImagePurpose.SHOWCASE,
          },
        ],
      },
    );

    expect(images.customizableBase[0].purpose).toBe(
      ProductImagePurpose.CUSTOMIZABLE_BASE,
    );
  });
});
