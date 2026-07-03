'use client';

import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import type { ProductCustomizationConfigJson } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import {
  useCustomizationDraft,
  type CustomizationDraft,
} from './customization-draft-context';
import { CustomizationForm } from './customization-form';
import { MockupCanvasControl } from './mockup-canvas-control';
import { toAbsoluteUrl } from '@/shared/presentation/lib/to-absolute-url';
import styles from './customization-experience.module.css';
import pageStyles from './page.module.css';

export interface ProductImageItem {
  url: string;
  alt: string;
}

interface CustomizationExperienceLabels {
  addToCart: string;
  removeFromCart: string;
  adding: string;
  added: string;
  error: string;
  customizationDesign: string;
  customizationPhrase: string;
  customizationColor: string;
  customizationSize: string;
  customizationSizePlaceholder: string;
  customizationUpload: string;
  customizationReplaceImage: string;
  customizationRemoveImage: string;
  customizationUploading: string;
  customizationInvalidImage: string;
  customizationImageTooLarge: string;
  customizationPreview: string;
  customizationPreviewDisclaimer: string;
  customizationPreviewUnavailable: string;
  customizationLimitedToDescription: string;
  customizationTextTooLong: string;
  customizationColorTooLong: string;
  customizationSizeTooLong: string;
  customizationInvalidImageUrl: string;
  customizationCanvasLabel: string;
  customizationCanvasHelp: string;
  customizationProductImageAlt: string;
  customizationDesignImageAlt: string;
  customizationUploadDesign: string;
  customizationReplaceDesign: string;
  customizationRemoveDesign: string;
  customizationDesignUploading: string;
  customizationDesignInvalid: string;
  customizationDesignTooLarge: string;
  customizationScaleLabel: string;
  customizationRotationLabel: string;
  customizationOpacityLabel: string;
  customizationPositionReadoutLabel: string;
  customizationPositionXLabel: string;
  customizationPositionYLabel: string;
  customizationCanvasReset: string;
  saveDesign: string;
}

interface CustomizationExperienceProps {
  productId: string;
  productName: string;
  productDescription: string;
  sellerId: string;
  sellerName: string;
  price: number;
  formattedPrice: string;
  previewBaseImageUrl: string;
  customizationConfig: ProductCustomizationConfigJson;
  productImages: ProductImageItem[];
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
  productImages,
  labels,
}: CustomizationExperienceProps) {
  const { draft, setImage, setDesignPosition } = useCustomizationDraft();
  const customizationModel =
    ProductCustomizationConfig.fromJson(customizationConfig);
  const allowsPhoto = customizationModel.allowPhotoDesign !== false;
  const activeProductImageUrl =
    productImages.find((img) => img.alt === draft.color)?.url ??
    previewBaseImageUrl;

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
    <div className={styles.root}>
      <header className={styles.header}>
        <span className={pageStyles.seller}>{sellerName}</span>
        <h1 className={pageStyles.title}>{productName}</h1>
        <p className={pageStyles.description}>{productDescription}</p>
      </header>

      <div className={styles.columns}>
        <div className={styles.canvasCol}>
          {allowsPhoto && previewBaseImageUrl && (
            <MockupCanvasControl
              productImageUrl={activeProductImageUrl}
              initialDesignUrl={draft.imageUrl}
              initialPosition={draft.designPosition}
              labels={{
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
              }}
              onUpload={uploadDesign}
              onPositionChange={setDesignPosition}
            />
          )}
        </div>

        <div className={styles.formCol}>
          <CustomizationForm
            customizationConfig={customizationConfig}
            productImageUrl={previewBaseImageUrl}
            productImages={productImages}
            labels={labels}
          />
        </div>
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
          labels={labels}
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
    </div>
  );
}

export function CustomizationExperience(props: CustomizationExperienceProps) {
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
        labels={props.labels}
      />
    );
  }

  return <CustomizationExperienceInner {...props} />;
}
