import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { CustomizationPreview } from '@/app/[locale]/products/[id]/customization-preview';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- stripping unoptimized prop
    const { unoptimized: _unoptimized, ...rest } =
      props as ImgHTMLAttributes<HTMLImageElement> & {
        unoptimized?: boolean;
      };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} />;
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
      imageOffset: { x: 40, y: 72, rotate: 12, scale: 0.92, maxWidth: 180 },
    });

    render(
      <CustomizationPreview
        baseImageUrl="/mug.png"
        overlayImageUrl="/template.png"
        customizationConfig={config.toJson()}
        draft={{
          text: 'Hello world',
          color: 'Blue',
          size: 'M',
          imageUploadId: 'upload-1',
          imageUrl: '/upload-preview.png',
          error: null,
          designPosition: null,
        }}
        labels={labels}
      />,
    );

    const previewFigure = screen
      .getAllByRole('img', { name: labels.customizationPreview })[0]
      .closest('figure');

    expect(previewFigure).toBeTruthy();
    const previewImages = previewFigure!.querySelectorAll('img');

    expect(previewImages).toHaveLength(3);
    expect(previewImages[0].src).toContain('/mug.png');
    expect(previewImages[1].src).toContain('/template.png');
    expect(previewImages[1].style.left).toBe('40px');
    expect(previewImages[1].style.top).toBe('72px');
    expect(previewImages[1].style.transform).toBe('rotate(12deg)');
    expect(previewImages[1].style.width).toBe('180px');
    expect(previewImages[1].style.height).toBe('auto');
    expect(previewImages[2].src).toContain('/upload-preview.png');
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
          designPosition: null,
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

  it('does not show the preview when the product is in description-only mode even if preview is enabled', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'description',
      previewEnabled: true,
      previewTemplateUrl: '/template.png',
    });

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
          designPosition: null,
        }}
        labels={labels}
      />,
    );

    expect(
      screen.getByText(labels.customizationPreviewUnavailable),
    ).toBeTruthy();
    expect(
      screen.queryByRole('img', { name: labels.customizationPreview }),
    ).toBeNull();
  });
});
