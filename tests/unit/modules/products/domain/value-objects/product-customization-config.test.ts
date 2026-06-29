import { describe, it, expect } from 'vitest';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';

describe('ProductCustomizationConfig', () => {
  it('defaults to description-only with no preview', () => {
    const config = ProductCustomizationConfig.default();

    expect(config.mode).toBe('description');
    expect(config.previewEnabled).toBe(false);
    expect(config.previewTemplateUrl).toBeNull();
    expect(config.textOffset).toBeNull();
    expect(config.imageOffset).toBeNull();
    expect(config.isDefault()).toBe(true);
    expect(config.isPreviewCapable()).toBe(false);
  });

  it('parses a preview-capable text_photo config', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'text_photo',
      previewEnabled: true,
      previewTemplateUrl: 'https://cdn.example.com/mug.png',
      textOffset: { x: 12, y: 34, rotate: 4 },
      imageOffset: { x: 5, y: 6, scale: 0.8 },
    });

    expect(config.mode).toBe('text_photo');
    expect(config.previewEnabled).toBe(true);
    expect(config.previewTemplateUrl).toBe('https://cdn.example.com/mug.png');
    expect(config.textOffset).toEqual({ x: 12, y: 34, rotate: 4 });
    expect(config.imageOffset).toEqual({ x: 5, y: 6, scale: 0.8 });
    expect(config.isPreviewCapable()).toBe(true);
    expect(config.allowsText()).toBe(true);
    expect(config.allowsPhoto()).toBe(true);
    expect(config.allowsStyleOptions()).toBe(true);
  });

  it('falls back to description-only for invalid JSON', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'invalid-mode',
      previewEnabled: 'yes',
    });

    expect(config.mode).toBe('description');
    expect(config.previewEnabled).toBe(false);
    expect(config.isPreviewCapable()).toBe(false);
  });
});
