import { describe, expect, it } from 'vitest';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { productFormSchema } from '@/modules/products/presentation/schemas/product-form-schema';

describe('productFormSchema', () => {
  it('strips translated fields from customizationConfig while keeping them in translations', () => {
    const result = productFormSchema.parse({
      price: 19.99,
      status: ProductStatus.ACTIVE,
      translations: [
        {
          locale: 'es',
          name: 'Taza',
          description: 'Base',
          tags: ['hogar'],
          sizes: ['S', 'M'],
          designChangeDescription: 'Cambia el estampado frontal',
        },
      ],
      customizationConfig: {
        mode: 'text_photo',
        previewEnabled: true,
        previewTemplateUrl: null,
        textOffset: { x: 1, y: 2 },
        imageOffset: { x: 3, y: 4 },
        sizeOptions: ['S', 'M'],
        tagNames: ['hogar'],
        designChangeDescription: 'Legacy copy',
      },
      images: [],
    });

    expect(result.translations).toEqual([
      {
        locale: 'es',
        name: 'Taza',
        description: 'Base',
        tags: ['hogar'],
        sizes: ['S', 'M'],
        designChangeDescription: 'Cambia el estampado frontal',
      },
    ]);
    expect(result.status).toBe(ProductStatus.ACTIVE);
    expect(result.customizationConfig).toEqual({
      mode: 'text_photo',
      previewEnabled: true,
      previewTemplateUrl: null,
      textOffset: { x: 1, y: 2 },
      imageOffset: { x: 3, y: 4 },
    });
  });

  it('accepts image metadata needed by the product media use cases', () => {
    const result = productFormSchema.parse({
      price: 19.99,
      translations: [
        {
          locale: 'es',
          name: 'Taza',
          description: 'Base',
          tags: [],
          sizes: [],
          designChangeDescription: null,
        },
      ],
      images: [
        {
          url: 'https://cdn.example.com/products/taza.mp4',
          alt: 'Taza en video',
          position: 0,
          purpose: ProductImagePurpose.SHOWCASE,
          mimeType: 'video/mp4',
          posterUrl: 'https://cdn.example.com/products/taza-poster.jpg',
        },
      ],
    });

    expect(result.images).toEqual([
      {
        url: 'https://cdn.example.com/products/taza.mp4',
        alt: 'Taza en video',
        position: 0,
        purpose: ProductImagePurpose.SHOWCASE,
        mimeType: 'video/mp4',
        posterUrl: 'https://cdn.example.com/products/taza-poster.jpg',
      },
    ]);
  });

  it('rejects unsupported status values', () => {
    const result = productFormSchema.safeParse({
      price: 19.99,
      status: 'PENDING',
      translations: [
        {
          locale: 'es',
          name: 'Taza',
          description: 'Base',
          tags: [],
          sizes: [],
          designChangeDescription: null,
        },
      ],
      images: [],
    });

    expect(result.success).toBe(false);
  });
});
