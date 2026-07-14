import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import {
  CustomizationExperience,
  type CustomizationExperienceLabels,
} from '@/app/[locale]/products/[id]/customization-experience';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const addToCartButtonMock = vi.fn((props: Record<string, unknown>) => (
  <button type="button" data-testid="mock-add-to-cart">
    {String((props as { labels: { addToCart: string } }).labels.addToCart)}
  </button>
));

vi.mock('@/modules/cart/presentation/components/add-to-cart-button', () => ({
  AddToCartButton: (props: Record<string, unknown>) =>
    addToCartButtonMock(props),
}));

vi.mock('@/app/[locale]/products/[id]/mockup-canvas-control', () => ({
  MockupCanvasControl: ({ productImageUrl }: { productImageUrl: string }) => (
    <div data-testid="mockup-image">{productImageUrl}</div>
  ),
}));

vi.mock('@/app/[locale]/products/[id]/similar-products', () => ({
  SimilarProducts: () => null,
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
    addAnotherPersonalization: 'Add another personalization',
    customizeProduct: 'Customize',
    addWithoutCustomization: 'Add without customization',
    customizationDesign: 'Instrucciones de personalización',
    customizationPhrase: 'Phrase',
    goToEdit: 'Go to edit',
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
    categoryLabel: 'Category',
    similarProducts: 'Similar products',
    similarProductsLoading: 'Loading...',
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
    categoryLink: { slug: 'mugs', name: 'Mugs' },
    locale: 'es',
    similarProductsLabels: {
      title: 'Similar products',
      loading: 'Loading...',
      noImageAvailable: 'No image',
      viewDetails: 'View details',
    },
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

  it('places the category link between the description and gallery', () => {
    render(
      <CustomizationExperience
        {...commonProps}
        customizationConfig={ProductCustomizationConfig.default().toJson()}
        labels={labels}
      />,
    );

    const categoryLink = screen.getByRole('link', { name: 'Category: Mugs' });
    const description = screen.getByText('A nice mug');
    const gallery = screen.getByTestId('showcase-gallery');

    expect(
      description.compareDocumentPosition(categoryLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      categoryLink.compareDocumentPosition(gallery) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps the previous image until the selected image is decoded', async () => {
    const decodeResolvers: Array<() => void> = [];
    class MockImage {
      src = '';
      // eslint-disable-next-line unicorn/consistent-function-scoping -- resolver is scoped to this test
      decode = vi.fn(function decodeImage() {
        return new Promise<void>((resolve) => {
          decodeResolvers.push(resolve);
        });
      });
    }
    vi.stubGlobal('Image', MockImage);

    render(
      <CustomizationExperience
        {...commonProps}
        productImages={[
          {
            url: '/red.png',
            alt: 'Red',
            purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
          },
          {
            url: '/blue.png',
            alt: 'Blue',
            purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
          },
        ]}
        customizationConfig={ProductCustomizationConfig.fromJson({
          mode: 'text_photo',
        }).toJson()}
        labels={labels}
        initialDraft={{ color: 'Red' }}
      />,
    );

    fireEvent.click(screen.getByTitle('Blue'));
    expect(screen.getByTestId('mockup-image')).toHaveTextContent('/red.png');
    expect(decodeResolvers).toHaveLength(1);

    decodeResolvers[0]();
    await waitFor(() =>
      expect(screen.getByTestId('mockup-image')).toHaveTextContent('/blue.png'),
    );
  });

  it('retains the previous image when the selected image fails to decode', async () => {
    class FailedImage {
      src = '';
      decode = vi.fn().mockRejectedValue(new Error('image unavailable'));
    }
    vi.stubGlobal('Image', FailedImage);

    render(
      <CustomizationExperience
        {...commonProps}
        productImages={[
          {
            url: '/red.png',
            alt: 'Red',
            purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
          },
          {
            url: '/blue.png',
            alt: 'Blue',
            purpose: ProductImagePurpose.CUSTOMIZABLE_BASE,
          },
        ]}
        customizationConfig={ProductCustomizationConfig.fromJson({
          mode: 'text_photo',
        }).toJson()}
        labels={labels}
        initialDraft={{ color: 'Red' }}
      />,
    );

    fireEvent.click(screen.getByTitle('Blue'));
    await waitFor(() =>
      expect(screen.getByTestId('mockup-image')).toHaveTextContent('/red.png'),
    );
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

    const purchaseFooter = layout.querySelector('footer');
    expect(purchaseFooter).not.toBeNull();
    if (!purchaseFooter) return;

    expect(purchaseFooter.parentElement).toBe(layout);
    expect(
      within(purchaseFooter).getByTestId('mock-add-to-cart'),
    ).toBeInTheDocument();
    expect(leftColumn).not.toContainElement(
      screen.getByTestId('mock-add-to-cart'),
    );
  });

  it('renders the designer text as personalization help', () => {
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
    const form = within(layout).getByTestId('customization-form');
    const descriptionField = within(form).getByLabelText(
      labels.customizationDesign,
    );
    expect(description.compareDocumentPosition(form)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(descriptionField).toHaveAccessibleDescription(
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
