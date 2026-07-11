'use client';

import { AddToCartButton } from '@/modules/cart/presentation/components/add-to-cart-button';
import type { ProductCustomizationConfigJson } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { Card } from '@/shared/ui/card';
import {
  CustomizationDraftProvider,
  useCustomizationDraft,
  type CustomizationDraft,
} from './customization-draft-context';
import { CustomizationForm } from './customization-form';
import { MockupCanvasControl } from './mockup-canvas-control';
import { toAbsoluteUrl } from '@/shared/presentation/lib/to-absolute-url';
import {
  ProductShowcaseGallery,
  type ProductShowcaseMedia,
} from './product-showcase-gallery';
import styles from './customization-experience.module.css';
import pageStyles from './page.module.css';

export interface ProductImageItem {
  url: string;
  alt: string;
  purpose: ProductImagePurpose;
}

export type CustomizationExperienceLabels = Record<string, string>;

interface CustomizationExperienceProps {
  productId: string;
  productName: string;
  productDescription: string;
  sellerId: string;
  sellerName: string;
  price: number;
  formattedPrice: string;
  previewBaseImageUrl: string;
  customizationConfig: ProductCustomizationConfigJson | null;
  sizes?: string[];
  productImages: ProductImageItem[];
  publicMedia: ProductShowcaseMedia[];
  labels: CustomizationExperienceLabels;
  initialDraft?: Partial<Omit<CustomizationDraft, 'error'>>;
}

function CustomizationExperienceInner({
  productId,
  productName,
  productDescription,
  sellerId,
  sellerName,
  price,
  formattedPrice,
  previewBaseImageUrl,
  customizationConfig,
  sizes,
  productImages,
  publicMedia,
  labels,
}: CustomizationExperienceProps) {
  const { draft, setImage, setDesignPosition } = useCustomizationDraft();
  const customizationModel =
    ProductCustomizationConfig.fromJson(customizationConfig);
  const resolvedCustomizationConfig =
    customizationConfig ?? ProductCustomizationConfig.default().toJson();
  const isAllowsPhoto = customizationModel.allowPhotoDesign !== false;
  const customizableBaseImages = productImages.filter(
    (image) => image.purpose === ProductImagePurpose.CUSTOMIZABLE_BASE,
  );
  const activeProductImageUrl =
    customizableBaseImages.find((img) => img.alt === draft.color)?.url ??
    previewBaseImageUrl;
  const formLabels = {
    customizationDesign: labels.customizationDesign,
    customizationPhrase: labels.customizationPhrase,
    customizationColor: labels.customizationColor,
    customizationSize: labels.customizationSize,
    customizationSizePlaceholder: labels.customizationSizePlaceholder,
    customizationUpload: labels.customizationUpload,
    customizationReplaceImage: labels.customizationReplaceImage,
    customizationRemoveImage: labels.customizationRemoveImage,
    customizationUploading: labels.customizationUploading,
    customizationInvalidImage: labels.customizationInvalidImage,
    customizationImageTooLarge: labels.customizationImageTooLarge,
    customizationPreview: labels.customizationPreview,
    customizationPreviewUnavailable: labels.customizationPreviewUnavailable,
    customizationLimitedToDescription: labels.customizationLimitedToDescription,
    customizationPreviewDisclaimer: labels.customizationPreviewDisclaimer,
    customizationCanvasLabel: labels.customizationCanvasLabel,
    customizationCanvasHelp: labels.customizationCanvasHelp,
    customizationProductImageAlt: labels.customizationProductImageAlt,
    customizationDesignImageAlt: labels.customizationDesignImageAlt,
    customizationUploadDesign: labels.customizationUploadDesign,
    customizationReplaceDesign: labels.customizationReplaceDesign,
    customizationRemoveDesign: labels.customizationRemoveDesign,
    customizationDesignUploading: labels.customizationDesignUploading,
    customizationDesignInvalid: labels.customizationDesignInvalid,
    customizationDesignTooLarge: labels.customizationDesignTooLarge,
    customizationScaleLabel: labels.customizationScaleLabel,
    customizationRotationLabel: labels.customizationRotationLabel,
    customizationOpacityLabel: labels.customizationOpacityLabel,
    customizationPositionReadoutLabel: labels.customizationPositionReadoutLabel,
    customizationPositionXLabel: labels.customizationPositionXLabel,
    customizationPositionYLabel: labels.customizationPositionYLabel,
    customizationCanvasReset: labels.customizationCanvasReset,
  };
  const mockupLabels = {
    canvasLabel: labels.customizationCanvasLabel,
    canvasHelp: labels.customizationCanvasHelp,
    productImageAlt: labels.customizationProductImageAlt,
    designImageAlt: labels.customizationDesignImageAlt,
    uploadDesign: labels.customizationUploadDesign,
    replaceDesign: labels.customizationReplaceDesign,
    removeDesign: labels.customizationRemoveDesign,
    uploading: labels.customizationDesignUploading,
    invalidImage: labels.customizationDesignInvalid,
    imageTooLarge: labels.customizationDesignTooLarge,
    scaleLabel: labels.customizationScaleLabel,
    rotationLabel: labels.customizationRotationLabel,
    opacityLabel: labels.customizationOpacityLabel,
    positionXLabel: labels.customizationPositionXLabel,
    positionYLabel: labels.customizationPositionYLabel,
    positionReadoutLabel: labels.customizationPositionReadoutLabel,
    resetLabel: labels.customizationCanvasReset,
    uploadingLabel: labels.customizationDesignUploading,
  };
  const cartLabels = {
    addToCart: labels.addToCart,
    removeFromCart: labels.removeFromCart,
    adding: labels.adding,
    added: labels.added,
    error: labels.error,
    increaseQuantity: labels.increaseQuantity,
    decreaseQuantity: labels.decreaseQuantity,
    saveDesign: labels.saveDesign,
    customizeProduct: labels.customizeProduct,
    addWithoutCustomization: labels.addWithoutCustomization,
    alreadyInCartDifferent: labels.alreadyInCartDifferent,
  };

  const uploadDesign = async (file: File) => {
    const response = await fetch('/api/uploads/guest/presigned-url', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      }),
      headers: { 'content-type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = (await response.json()) as {
      id: string;
      uploadUrl: string;
      storageKey: string;
      publicUrl: string;
    };

    await fetch(result.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: file,
    });

    const imageUrl = toAbsoluteUrl(result.publicUrl);
    setImage({ imageUploadId: result.id, imageUrl });

    return {
      imageUploadId: result.id,
      imageUrl,
    };
  };

  return (
    <Card as="section" padding="lg" className={styles.card}>
      <div className={styles.layout} data-testid="purchase-layout">
        <section
          className={styles.purchaseColumn}
          data-testid="purchase-layout-left"
        >
          <div className={styles.canvasCol}>
            {isAllowsPhoto && previewBaseImageUrl && (
              <MockupCanvasControl
                productImageUrl={activeProductImageUrl}
                initialDesignUrl={draft.imageUrl}
                initialPosition={draft.designPosition}
                labels={mockupLabels}
                onUpload={uploadDesign}
                onPositionChange={setDesignPosition}
              />
            )}
          </div>

          <div className={styles.formCol}>
            <CustomizationForm
              customizationConfig={resolvedCustomizationConfig}
              sizes={sizes}
              productImages={customizableBaseImages}
              labels={formLabels}
            />
          </div>

          <footer className={styles.footer}>
            <p className={styles.price}>{formattedPrice}</p>
            <AddToCartButton
              productId={productId}
              productName={productName}
              sellerId={sellerId}
              sellerName={sellerName}
              price={price}
              imageUrl={activeProductImageUrl}
              customizationAvailable={!customizationModel.isDefault()}
              customizeHref="#customization-form"
              labels={cartLabels}
              customization={{
                text: draft.text,
                color: draft.color,
                size: draft.size,
                imageUploadId: draft.imageUploadId,
                imageUrl: draft.imageUrl,
                designPosition: draft.designPosition,
              }}
            />
          </footer>
        </section>

        <aside
          className={styles.presentationColumn}
          data-testid="purchase-layout-right"
        >
          <header className={styles.header}>
            <span className={pageStyles.seller}>{sellerName}</span>
            <h1 className={pageStyles.title}>{productName}</h1>
            <p className={pageStyles.description}>{productDescription}</p>
          </header>

          <ProductShowcaseGallery
            items={publicMedia}
            labels={{
              previous: labels.mediaPrevious,
              next: labels.mediaNext,
            }}
          />
        </aside>
      </div>
    </Card>
  );
}

export function CustomizationExperience(props: CustomizationExperienceProps) {
  const cartLabels = {
    addToCart: props.labels.addToCart,
    removeFromCart: props.labels.removeFromCart,
    adding: props.labels.adding,
    added: props.labels.added,
    error: props.labels.error,
    increaseQuantity: props.labels.increaseQuantity,
    decreaseQuantity: props.labels.decreaseQuantity,
    saveDesign: props.labels.saveDesign,
    customizeProduct: props.labels.customizeProduct,
    addWithoutCustomization: props.labels.addWithoutCustomization,
    alreadyInCartDifferent: props.labels.alreadyInCartDifferent,
  };

  if (process.env.NEXT_PUBLIC_CUSTOMIZATION_FRONTEND_ENABLED === 'false') {
    return (
      <AddToCartButton
        productId={props.productId}
        productName={props.productName}
        sellerId={props.sellerId}
        sellerName={props.sellerName}
        price={props.price}
        imageUrl={props.previewBaseImageUrl}
        customizationAvailable={false}
        labels={cartLabels}
      />
    );
  }

  const validationLabels = {
    textTooLong: props.labels.customizationTextTooLong,
    colorTooLong: props.labels.customizationColorTooLong,
    sizeTooLong: props.labels.customizationSizeTooLong,
    invalidImageUrl: props.labels.customizationInvalidImageUrl,
  };

  return (
    <CustomizationDraftProvider
      initialDraft={props.initialDraft}
      validationLabels={validationLabels}
    >
      <CustomizationExperienceInner {...props} />
    </CustomizationDraftProvider>
  );
}
