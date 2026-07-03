import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { CustomizationDraftProvider } from '@/app/[locale]/products/[id]/customization-draft-context';
import { CustomizationExperience } from '@/app/[locale]/products/[id]/customization-experience';

const addToCartButtonMock = vi.fn((props: Record<string, unknown>) => (
  <button type="button" data-testid="mock-add-to-cart">
    {String((props as { labels: { addToCart: string } }).labels.addToCart)}
  </button>
));

vi.mock('@/components/cart/add-to-cart-button', () => ({
  AddToCartButton: (props: Record<string, unknown>) =>
    addToCartButtonMock(props),
}));

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { unoptimized: _unoptimized, ...rest } =
      props as ImgHTMLAttributes<HTMLImageElement> & {
        unoptimized?: boolean;
      };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('CustomizationExperience', () => {
  const labels = {
    addToCart: 'Add to cart',
    removeFromCart: 'Remove',
    adding: 'Adding...',
    added: 'Added',
    error: 'Error',
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
    customizationPreview: 'Customization preview',
    customizationPreviewDisclaimer:
      'Preview is a buying aid only — final product may vary.',
    customizationPreviewUnavailable: 'Preview unavailable',
    customizationLimitedToDescription: 'Customization is limited to text only.',
    customizationTextTooLong: 'Customization text is too long.',
    customizationColorTooLong: 'Customization color is too long.',
    customizationSizeTooLong: 'Customization size is too long.',
    customizationInvalidImageUrl: 'Customization image must be a valid URL.',
    customizationCanvasLabel: 'Canvas',
    customizationCanvasHelp: 'Position the design',
    customizationProductImageAlt: 'Product image',
    customizationDesignImageAlt: 'Design preview',
    customizationUploadDesign: 'Upload design',
    customizationReplaceDesign: 'Replace design',
    customizationRemoveDesign: 'Remove design',
    customizationDesignUploading: 'Uploading...',
    customizationDesignInvalid: 'Invalid image',
    customizationDesignTooLarge: 'Image too large',
    customizationScaleLabel: 'Scale',
    customizationRotationLabel: 'Rotation',
    customizationOpacityLabel: 'Opacity',
    customizationPositionReadoutLabel: 'Position',
    customizationPositionXLabel: 'X',
    customizationPositionYLabel: 'Y',
    customizationCanvasReset: 'Reset',
    saveDesign: 'Save design',
    alreadyInCartDifferent: 'Already in cart',
  };

  const validationLabels = {
    textTooLong: 'Customization text is too long.',
    colorTooLong: 'Customization color is too long.',
    sizeTooLong: 'Customization size is too long.',
    invalidImageUrl: 'Customization image must be a valid URL.',
  };

  const commonProps = {
    productId: 'prod-1',
    productName: 'Mug',
    productDescription: 'A nice mug',
    sellerId: 'seller-1',
    sellerName: 'Test Seller',
    price: 12.5,
    formattedPrice: '$12.50',
    previewBaseImageUrl: '/mug.png',
    productImages: [] as { url: string; alt: string }[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CUSTOMIZATION_FRONTEND_ENABLED = 'true';
  });

  it('renders the customization experience and forwards the draft to add-to-cart', () => {
    const config = ProductCustomizationConfig.fromJson({
      mode: 'text_photo',
      previewEnabled: true,
      previewTemplateUrl: '/mug.png',
    });

    render(
      <CustomizationDraftProvider
        validationLabels={validationLabels}
        initialDraft={{ text: 'Hello', imageUrl: '/upload.png' }}
      >
        <CustomizationExperience
          {...commonProps}
          customizationConfig={config.toJson()}
          labels={labels}
        />
      </CustomizationDraftProvider>,
    );

    expect(screen.getByLabelText(labels.customizationDesign)).toBeTruthy();
    const props = addToCartButtonMock.mock.calls[0][0] as {
      customization: { text: string | null; imageUrl: string | null };
    };
    expect(props.customization.text).toBe('Hello');
    expect(props.customization.imageUrl).toBe('/upload.png');
  });

  it('falls back to the legacy add-to-cart button when the feature flag is disabled', () => {
    process.env.NEXT_PUBLIC_CUSTOMIZATION_FRONTEND_ENABLED = 'false';

    render(
      <CustomizationExperience
        {...commonProps}
        customizationConfig={ProductCustomizationConfig.default().toJson()}
        labels={labels}
      />,
    );

    expect(screen.queryByLabelText(labels.customizationDesign)).toBeNull();
    expect(
      screen.queryByText(labels.customizationPreviewDisclaimer),
    ).toBeNull();
    expect(screen.getByTestId('mock-add-to-cart')).toBeTruthy();
  });

  it('renders the customization UI by default when the flag is unset', () => {
    delete process.env.NEXT_PUBLIC_CUSTOMIZATION_FRONTEND_ENABLED;

    render(
      <CustomizationDraftProvider validationLabels={validationLabels}>
        <CustomizationExperience
          {...commonProps}
          customizationConfig={ProductCustomizationConfig.default().toJson()}
          labels={labels}
        />
      </CustomizationDraftProvider>,
    );

    expect(screen.getByLabelText(labels.customizationDesign)).toBeTruthy();
  });
});
