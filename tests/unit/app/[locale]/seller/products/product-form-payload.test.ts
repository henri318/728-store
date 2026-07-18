import { describe, expect, it } from 'vitest';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { productFormSchema } from '@/modules/products/presentation/schemas/product-form-schema';
import {
  buildPayload,
  mapErrors,
} from '@/app/[locale]/seller/products/product-form-payload';
import type { FormState } from '@/app/[locale]/seller/products/product-form-types';

function createForm(): FormState {
  return {
    price: '19.99',
    activeLocale: 'es',
    translations: {
      es: {
        locale: 'es',
        name: 'Taza',
        description: '',
        tags: [],
        sizes: [],
        designChangeDescription: null,
        photoLabels: {},
      },
      cat: {
        locale: 'cat',
        name: '',
        description: '',
        tags: [],
        sizes: [],
        designChangeDescription: null,
        photoLabels: {},
      },
    },
    customizationConfig: {
      mode: 'description',
      previewEnabled: false,
      previewTemplateUrl: null,
      textOffset: null,
      imageOffset: null,
    },
    images: {
      cover: null,
      showcase: [],
      customizableBase: [
        {
          id: 'base-1',
          url: 'https://cdn.example.com/base.png',
          alt: 'Base',
          purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
          mimeType: 'image/png',
          posterUrl: null,
        },
      ],
    },
    selectedPhotoId: 'base-1',
  };
}

describe('product form payload', () => {
  it('infers text_photo from the domain config when a customizable base exists', () => {
    const result = buildPayload('es', createForm());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.payload.customizationConfig?.mode).toBe('text_photo');
    }
  });

  it('maps nested customization errors and falls back to general for unknown and translation paths', () => {
    const customization = productFormSchema.safeParse({
      price: 19.99,
      customizationConfig: {
        mode: 'invalid',
        previewEnabled: false,
        previewTemplateUrl: null,
        textOffset: null,
        imageOffset: null,
      },
    });
    const unknown = productFormSchema.safeParse({ price: 19.99, legacy: true });
    const translation = productFormSchema.safeParse({
      price: 19.99,
      translations: [{ locale: 'es', name: '' }],
    });

    expect(customization.success).toBe(false);
    expect(unknown.success).toBe(false);
    expect(translation.success).toBe(false);
    if (!customization.success) {
      expect(mapErrors(customization.error).customizationConfig).toBeTruthy();
    }
    if (!unknown.success) {
      expect(mapErrors(unknown.error).general).toBeTruthy();
    }
    if (!translation.success) {
      expect(mapErrors(translation.error).general).toBeTruthy();
    }
  });
});
