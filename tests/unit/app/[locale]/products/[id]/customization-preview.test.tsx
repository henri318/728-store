import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { CustomizationPreview } from '@/app/[locale]/products/[id]/customization-preview';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe('CustomizationPreview', () => {
  const labels = {
    customizationPreview: 'Customization preview',
    customizationPreviewDisclaimer:
      'Preview is a buying aid only — final product may vary.',
    customizationPreviewUnavailable: 'Preview unavailable',
    customizationLimitedToDescription: 'Customization is limited to text only.',
  };

  it('renders the preview overlay and disclaimer when the product can preview from the base image', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'text_photo',
      previewEnabled: true,
      textOffset: { x: 24, y: 48, maxWidth: 180 },
      imageOffset: { x: 40, y: 72, scale: 0.92 },
    });

    render(
      <CustomizationPreview
        baseImageUrl="/mug.png"
        customizationConfig={config.toJson()}
        draft={{
          text: 'Hello world',
          color: 'Blue',
          size: 'M',
          imageUploadId: 'upload-1',
          imageUrl: '/upload-preview.png',
          error: null,
        }}
        labels={labels}
      />,
    );

    expect(
      screen.getAllByRole('img', { name: labels.customizationPreview })[0],
    ).toBeTruthy();
    expect(screen.getByText('Hello world')).toBeTruthy();
    expect(
      screen.getByText(labels.customizationPreviewDisclaimer),
    ).toBeTruthy();
  });

  it('falls back to description-only messaging when preview is unavailable', () => {
    const config = ProductCustomizationConfig.default();

    render(
      <CustomizationPreview
        baseImageUrl="/mug.png"
        customizationConfig={config.toJson()}
        draft={{
          text: 'Fallback text',
          color: null,
          size: null,
          imageUploadId: null,
          imageUrl: null,
          error: null,
        }}
        labels={labels}
      />,
    );

    expect(
      screen.getByText(labels.customizationPreviewUnavailable),
    ).toBeTruthy();
    expect(
      screen.getByText(labels.customizationPreviewDisclaimer),
    ).toBeTruthy();
    expect(screen.queryByText('Fallback text')).toBeNull();
  });
});
