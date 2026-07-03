import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { CustomizationDraftProvider } from '@/app/[locale]/products/[id]/customization-draft-context';
import { CustomizationForm } from '@/app/[locale]/products/[id]/customization-form';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe('CustomizationForm', () => {
  const validationLabels = {
    textTooLong: 'Customization text is too long.',
    colorTooLong: 'Customization color is too long.',
    sizeTooLong: 'Customization size is too long.',
    invalidImageUrl: 'Customization image must be a valid URL.',
  };

  const labels = {
    customizationDesign: 'Design description',
    customizationPhrase: 'Phrase',
    customizationColor: 'Color',
    customizationSize: 'Size',
    customizationSizePlaceholder: 'Choose a size',
    customizationUpload: 'Upload image',
    customizationReplaceImage: 'Replace image',
    customizationRemoveImage: 'Remove image',
    customizationUploading: 'Uploading image...',
    customizationInvalidImage: 'Please upload a PNG or JPEG image.',
    customizationImageTooLarge: 'The image is too large.',
    customizationPreviewUnavailable: 'Preview unavailable',
    customizationLimitedToDescription: 'Customization is limited to text only.',
    customizationPreview: 'Customization preview',
    customizationPreviewDisclaimer:
      'Preview is a buying aid only — final product may vary.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only the description field for description-only products', () => {
    render(
      <CustomizationDraftProvider validationLabels={validationLabels}>
        <CustomizationForm
          customizationConfig={ProductCustomizationConfig.default().toJson()}
          labels={labels}
        />
      </CustomizationDraftProvider>,
    );

    expect(screen.getByLabelText(labels.customizationDesign)).toBeTruthy();
    expect(screen.queryByLabelText(labels.customizationPhrase)).toBeNull();
    expect(screen.queryByLabelText(labels.customizationColor)).toBeNull();
    expect(screen.queryByLabelText(labels.customizationSize)).toBeNull();
    expect(screen.queryByLabelText(labels.customizationUpload)).toBeNull();
  });

  it('renders text, style, and photo controls for combined capabilities', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'text_photo',
      previewEnabled: true,
      previewTemplateUrl: '/mug.png',
      sizeOptions: ['XS', 'S', 'M', 'L'],
    });

    render(
      <CustomizationDraftProvider validationLabels={validationLabels}>
        <CustomizationForm
          customizationConfig={config.toJson()}
          labels={labels}
        />
      </CustomizationDraftProvider>,
    );

    expect(screen.getByLabelText(labels.customizationPhrase)).toBeTruthy();
    expect(screen.getByLabelText(labels.customizationColor)).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: labels.customizationSize }),
    ).toHaveDisplayValue(labels.customizationSizePlaceholder);
    expect(
      screen.getByRole('combobox', { name: labels.customizationSize }),
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'XS' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'L' })).toBeTruthy();
    expect(screen.getByLabelText(labels.customizationUpload)).toBeTruthy();
  });

  it('falls back to default size options when the config omits them', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'text',
      previewEnabled: true,
      previewTemplateUrl: '/mug.png',
    });

    render(
      <CustomizationDraftProvider validationLabels={validationLabels}>
        <CustomizationForm
          customizationConfig={config.toJson()}
          labels={labels}
        />
      </CustomizationDraftProvider>,
    );

    const sizeSelect = screen.getByRole('combobox', {
      name: labels.customizationSize,
    });

    expect(sizeSelect).toBeTruthy();
    expect(screen.getByRole('option', { name: 'S' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'M' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'L' })).toBeTruthy();
  });

  it('marks invalid text input with aria-invalid and an error description after validation', async () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'text',
      previewEnabled: true,
      previewTemplateUrl: '/mug.png',
    });

    render(
      <CustomizationDraftProvider validationLabels={validationLabels}>
        <CustomizationForm
          customizationConfig={config.toJson()}
          labels={labels}
        />
      </CustomizationDraftProvider>,
    );

    const input = screen.getByLabelText(labels.customizationPhrase);
    fireEvent.change(input, { target: { value: 'x'.repeat(501) } });
    fireEvent.click(
      screen.getByRole('button', { name: labels.customizationPreview }),
    );

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
    expect(screen.getByText(validationLabels.textTooLong)).toBeTruthy();
  });
});
