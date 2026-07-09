import { describe, expect, it } from 'vitest';
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
