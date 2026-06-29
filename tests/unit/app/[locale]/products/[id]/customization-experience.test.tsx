import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
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
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
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
    customizationUpload: 'Upload image',
    customizationReplaceImage: 'Replace image',
    customizationRemoveImage: 'Remove image',
    customizationInvalidImage: 'Please upload a PNG or JPEG image.',
    customizationImageTooLarge: 'The image is too large.',
    customizationPreview: 'Customization preview',
    customizationPreviewDisclaimer:
      'Preview is a buying aid only — final product may vary.',
    customizationPreviewUnavailable: 'Preview unavailable',
    customizationLimitedToDescription: 'Customization is limited to text only.',
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
      <CustomizationExperience
        productId="prod-1"
        productName="Mug"
        sellerId="seller-1"
        sellerName="Test Seller"
        price={12.5}
        previewBaseImageUrl="/mug.png"
        customizationConfig={config}
        labels={labels}
        initialDraft={{ text: 'Hello', imageUrl: '/upload.png' }}
      />,
    );

    expect(screen.getByLabelText(labels.customizationPhrase)).toBeTruthy();
    expect(
      screen.getByText(labels.customizationPreviewDisclaimer),
    ).toBeTruthy();
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
        productId="prod-1"
        productName="Mug"
        sellerId="seller-1"
        sellerName="Test Seller"
        price={12.5}
        previewBaseImageUrl="/mug.png"
        customizationConfig={ProductCustomizationConfig.default()}
        labels={labels}
      />,
    );

    expect(screen.queryByLabelText(labels.customizationDesign)).toBeNull();
    expect(
      screen.queryByText(labels.customizationPreviewDisclaimer),
    ).toBeNull();
    expect(screen.getByTestId('mock-add-to-cart')).toBeTruthy();
  });
});
