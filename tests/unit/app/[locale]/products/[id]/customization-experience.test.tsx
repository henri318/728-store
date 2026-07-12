import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import {
  CustomizationExperience,
  type CustomizationExperienceLabels,
} from '@/app/[locale]/products/[id]/customization-experience';

const addToCartButtonMock = vi.fn((props: Record<string, unknown>) => (
  <button type="button" data-testid="mock-add-to-cart">
    {String((props as { labels: { addToCart: string } }).labels.addToCart)}
  </button>
));

vi.mock('@/modules/cart/presentation/components/add-to-cart-button', () => ({
  AddToCartButton: (props: Record<string, unknown>) =>
    addToCartButtonMock(props),
}));

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

describe('CustomizationExperience', () => {
  const labels = {
    addToCart: 'Add to cart',
    removeFromCart: 'Remove',
    adding: 'Adding...',
    added: 'Added',
    error: 'Error',
    increaseQuantity: 'Increase quantity',
    decreaseQuantity: 'Decrease quantity',
    saveDesign: 'Save design',
    customizeProduct: 'Customize',
    addWithoutCustomization: 'Add without customization',
    alreadyInCartDifferent: 'Already in cart',
    customizationDesign: 'Instrucciones de personalización',
    customizationPhrase: 'Phrase',
    goToEdit: 'Go to edit',
    customizationCapabilityHeading: 'What can the customer customize?',
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
    mediaPrevious: 'Previous',
    mediaNext: 'Next',
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
  } satisfies CustomizationExperienceLabels;

  const commonProps = {
    productId: 'prod-1',
    productName: 'Mug',
    productDescription: 'A nice mug',
    sellerId: 'seller-1',
    sellerName: 'Test Seller',
    price: 12.5,
    formattedPrice: '$12.50',
    previewBaseImageUrl: '/mug.png',
    sizes: ['M'],
    publicMedia: [
      {
        id: 'cover-1',
        url: '/cover.png',
        alt: 'Cover',
        mimeType: 'image/png',
        posterUrl: null,
      },
    ],
    productImages: [
      {
        url: '/red.png',
        alt: 'Red',
        purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
      },
    ],
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
        {...commonProps}
        customizationConfig={config.toJson()}
        labels={labels}
        initialDraft={{ text: 'Hello', imageUrl: '/upload.png' }}
      />,
    );

    expect(screen.getByLabelText(labels.customizationDesign)).toBeTruthy();
    const props = addToCartButtonMock.mock.calls[0][0] as {
      customization: { text: string | null; imageUrl: string | null };
    };
    expect(props.customization.text).toBe('Hello');
    expect(props.customization.imageUrl).toBe('/upload.png');
  });

  it('keeps the product presentation in the right column and the form in the left column', () => {
    const config = ProductCustomizationConfig.default();

    render(
      <CustomizationExperience
        {...commonProps}
        customizationConfig={config.toJson()}
        labels={labels}
      />,
    );

    const layout = screen.getByTestId('purchase-layout');
    const leftColumn = within(layout).getByTestId('purchase-layout-left');
    const rightColumn = within(layout).getByTestId('purchase-layout-right');

    expect(
      within(rightColumn).getByRole('heading', { name: 'Mug' }),
    ).toBeInTheDocument();
    expect(within(rightColumn).getByText('A nice mug')).toBeInTheDocument();
    expect(
      within(rightColumn).getByTestId('showcase-gallery'),
    ).toBeInTheDocument();

    expect(
      within(leftColumn).getByLabelText(labels.customizationDesign),
    ).toBeInTheDocument();
    expect(
      within(leftColumn).getByTestId('mock-add-to-cart'),
    ).toBeInTheDocument();
  });

  it('renders public customization content in description, capability, style, form, and canvas order', () => {
    render(
      <CustomizationExperience
        {...commonProps}
        customizationConfig={ProductCustomizationConfig.default().toJson()}
        designChangeDescription="Puede cambiar el color y añadir una imagen"
        labels={labels}
      />,
    );

    const layout = screen.getByTestId('purchase-layout');
    const description = within(layout).getByText('A nice mug');
    const capability = within(layout).getByTestId('customization-capability');
    const style = within(layout).getAllByTestId(
      'customization-style-selectors',
    )[0];
    const form = within(layout).getByTestId('customization-form');
    const descriptionField = within(form).getByLabelText(
      labels.customizationDesign,
    );
    const canvas = within(layout).getByTestId('mockup-canvas');
    expect(description.compareDocumentPosition(capability)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(capability.compareDocumentPosition(style)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(style.compareDocumentPosition(descriptionField)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(form.compareDocumentPosition(canvas)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByTestId('customization-capability')).toHaveTextContent(
      'Puede cambiar el color y añadir una imagen',
    );
    expect(
      screen.queryByText('Instrucciones subidas por el diseñador'),
    ).toBeNull();
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
      <CustomizationExperience
        {...commonProps}
        customizationConfig={ProductCustomizationConfig.default().toJson()}
        labels={labels}
      />,
    );

    expect(screen.getByLabelText(labels.customizationDesign)).toBeTruthy();
  });

  it('keeps the customizer entry point when no customizable bases exist', () => {
    render(
      <CustomizationExperience
        {...commonProps}
        customizationConfig={ProductCustomizationConfig.default().toJson()}
        labels={labels}
      />,
    );

    expect(screen.getByTestId('mock-add-to-cart')).toBeTruthy();
  });
});
