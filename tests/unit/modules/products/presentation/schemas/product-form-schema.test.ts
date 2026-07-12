import { describe, expect, it } from 'vitest';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import {
  productFormSchema,
  productTranslationInputSchema,
} from '@/modules/products/presentation/schemas/product-form-schema';

describe('productFormSchema', () => {
  it('accepts translated input with design change description', () => {
    const result = productTranslationInputSchema.safeParse({
      locale: 'es',
      name: 'Taza',
      designChangeDescription: 'Descripción interna',
    });

    expect(result.success).toBe(true);
  });

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

  it('rejects unsupported MIME-purpose combinations and multiple cover images', () => {
    expect(
      productFormSchema.safeParse({
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
            url: 'https://cdn.example.com/products/taza.svg',
            alt: 'SVG no permitido',
            position: 0,
            purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
            mimeType: 'image/svg+xml',
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      productFormSchema.safeParse({
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
            alt: 'Video cover',
            position: 0,
            purpose: ProductImagePurpose.COVER,
            mimeType: 'video/mp4',
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      productFormSchema.safeParse({
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
            url: 'https://cdn.example.com/products/taza.png',
            alt: 'Primer cover',
            position: 0,
            purpose: ProductImagePurpose.COVER,
            mimeType: 'image/png',
          },
          {
            url: 'https://cdn.example.com/products/taza-2.png',
            alt: 'Segundo cover',
            position: 1,
            purpose: ProductImagePurpose.COVER,
            mimeType: 'image/png',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('accepts showcase videos', () => {
    const result = productFormSchema.safeParse({
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

    expect(result.success).toBe(true);
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
