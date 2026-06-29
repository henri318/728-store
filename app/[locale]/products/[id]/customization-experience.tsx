'use client';

import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import type { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import {
  CustomizationDraftProvider,
  useCustomizationDraft,
  type CustomizationDraft,
} from './customization-draft-context';
import { CustomizationForm } from './customization-form';
import { CustomizationPreview } from './customization-preview';

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
  customizationUpload: string;
  customizationReplaceImage: string;
  customizationRemoveImage: string;
  customizationInvalidImage: string;
  customizationImageTooLarge: string;
  customizationPreview: string;
  customizationPreviewDisclaimer: string;
  customizationPreviewUnavailable: string;
  customizationLimitedToDescription: string;
}

interface CustomizationExperienceProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  previewBaseImageUrl: string;
  customizationConfig: ProductCustomizationConfig;
  labels: CustomizationExperienceLabels;
  initialDraft?: Partial<Omit<CustomizationDraft, 'error'>>;
}

function CustomizationExperienceInner({
  productId,
  productName,
  sellerId,
  sellerName,
  price,
  previewBaseImageUrl,
  customizationConfig,
  labels,
}: CustomizationExperienceProps) {
  const { draft } = useCustomizationDraft();

  return (
    <section>
      <CustomizationForm
        customizationConfig={customizationConfig}
        labels={labels}
      />
      <CustomizationPreview
        baseImageUrl={previewBaseImageUrl}
        customizationConfig={customizationConfig}
        draft={draft}
        labels={labels}
      />
      <AddToCartButton
        productId={productId}
        productName={productName}
        sellerId={sellerId}
        sellerName={sellerName}
        price={price}
        imageUrl={previewBaseImageUrl}
        labels={labels}
        customization={{
          text: draft.text,
          color: draft.color,
          size: draft.size,
          imageUploadId: draft.imageUploadId,
          imageUrl: draft.imageUrl,
        }}
      />
    </section>
  );
}

export function CustomizationExperience(props: CustomizationExperienceProps) {
  if (process.env.NEXT_PUBLIC_CUSTOMIZATION_FRONTEND_ENABLED !== 'true') {
    return (
      <AddToCartButton
        productId={props.productId}
        productName={props.productName}
        sellerId={props.sellerId}
        sellerName={props.sellerName}
        price={props.price}
        imageUrl={props.previewBaseImageUrl}
        labels={props.labels}
      />
    );
  }

  return (
    <CustomizationDraftProvider initialDraft={props.initialDraft}>
      <CustomizationExperienceInner {...props} />
    </CustomizationDraftProvider>
  );
}
