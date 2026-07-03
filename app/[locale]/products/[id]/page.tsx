import { notFound } from 'next/navigation';
import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import type { ProductImageEntity } from '@/modules/products/domain/entities/product-image';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import Link from 'next/link';
import { CustomizationExperience } from './customization-experience';
import { CustomizationDraftProvider } from './customization-draft-context';
import styles from './page.module.css';

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  const dict = await getDictionary(locale as 'es' | 'cat');

  const repository = container.getProductRepository();
  const useCase = new GetProductByIdUseCase(repository);

  let product = null;
  let error = false;

  try {
    product = await useCase.execute(id, locale);
  } catch {
    error = true;
  }

  if (error || !product) {
    return <div>{dict.common.productDetailsError}</div>;
  }

  if (product.status !== 'ACTIVE') {
    notFound();
  }

  const getValue = (value: string | string[] | undefined): string | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

  const customizationConfig =
    product.customizationConfig ?? ProductCustomizationConfig.default();
  const previewBaseImageUrl = product.images?.[0]?.url ?? '';
  const productImages = (product.images ?? []).map(
    (img: ProductImageEntity) => ({
      url: img.url,
      alt: img.alt ?? '',
    }),
  );

  const rawDesignPosition = getValue(query.customizationDesignPosition);
  const designPosition = rawDesignPosition
    ? (() => {
        try {
          return JSON.parse(rawDesignPosition);
        } catch {
          return null;
        }
      })()
    : null;

  const initialDraft = {
    text: getValue(query.customizationText),
    color: getValue(query.customizationColor),
    size: getValue(query.customizationSize),
    imageUploadId: getValue(query.customizationImageUploadId),
    imageUrl: getValue(query.customizationImageUrl),
    designPosition,
  };

  const labels = {
    addToCart: dict.common.addToCart,
    removeFromCart: dict.common.removeFromCart,
    adding: dict.common.addingToCart,
    added: dict.common.addedToCart,
    error: dict.common.cartError,
    customizeProduct: dict.common.customizeProduct,
    addWithoutCustomization: dict.common.addWithoutCustomization,
    customizationChoiceBadge: dict.common.customizable,
    customizationChoiceMessage: dict.common.customizationChoiceMessage,
    decreaseQuantity: dict.common.decreaseQuantity,
    increaseQuantity: dict.common.increaseQuantity,
    customizationDesign: dict.common.customizationDesign,
    customizationPhrase: dict.common.customizationPhrase,
    customizationColor: dict.common.customizationColor,
    customizationSize: dict.common.customizationSize,
    customizationSizePlaceholder: dict.common.customizationSizePlaceholder,
    customizationUpload: dict.common.customizationUpload,
    customizationReplaceImage: dict.common.customizationReplaceImage,
    customizationRemoveImage: dict.common.customizationRemoveImage,
    customizationUploading: dict.common.customizationUploading,
    customizationInvalidImage: dict.common.customizationInvalidImage,
    customizationImageTooLarge: dict.common.customizationImageTooLarge,
    customizationPreview: dict.common.customizationPreview,
    customizationPreviewDisclaimer: dict.common.customizationPreviewDisclaimer,
    customizationPreviewUnavailable:
      dict.common.customizationPreviewUnavailable,
    customizationLimitedToDescription:
      dict.common.customizationLimitedToDescription,
    customizationTextTooLong: dict.common.customizationTextTooLong,
    customizationColorTooLong: dict.common.customizationColorTooLong,
    customizationSizeTooLong: dict.common.customizationSizeTooLong,
    customizationInvalidImageUrl: dict.common.customizationInvalidImageUrl,
    customizationCanvasLabel: dict.common.customizationCanvasLabel,
    customizationCanvasHelp: dict.common.customizationCanvasHelp,
    customizationProductImageAlt: dict.common.customizationProductImageAlt,
    customizationDesignImageAlt: dict.common.customizationDesignImageAlt,
    customizationUploadDesign: dict.common.customizationUploadDesign,
    customizationReplaceDesign: dict.common.customizationReplaceDesign,
    customizationRemoveDesign: dict.common.customizationRemoveDesign,
    customizationDesignUploading: dict.common.customizationDesignUploading,
    customizationDesignInvalid: dict.common.customizationDesignInvalid,
    customizationDesignTooLarge: dict.common.customizationDesignTooLarge,
    customizationScaleLabel: dict.common.customizationScaleLabel,
    customizationRotationLabel: dict.common.customizationRotationLabel,
    customizationOpacityLabel: dict.common.customizationOpacityLabel,
    customizationPositionReadoutLabel:
      dict.common.customizationPositionReadoutLabel,
    customizationPositionXLabel: dict.common.customizationPositionXLabel,
    customizationPositionYLabel: dict.common.customizationPositionYLabel,
    customizationCanvasReset: dict.common.customizationCanvasReset,
    saveDesign: dict.common.saveDesign,
    alreadyInCartDifferent: dict.common.alreadyInCartDifferent,
  };

  return (
    <div className={styles.container}>
      <Link href={`/${locale}`} className={styles.backLink}>
        ← {dict.common.home}
      </Link>
      <CustomizationDraftProvider
        initialDraft={initialDraft}
        validationLabels={{
          textTooLong: dict.common.customizationTextTooLong,
          colorTooLong: dict.common.customizationColorTooLong,
          sizeTooLong: dict.common.customizationSizeTooLong,
          invalidImageUrl: dict.common.customizationInvalidImageUrl,
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className={styles.contentColumn}>
            <div className={styles.customizationCard}>
              <CustomizationExperience
                productId={product.id}
                productName={product.displayName}
                productDescription={product.displayDescription ?? ''}
                sellerId={product.sellerId}
                sellerName={product.sellerName}
                price={product.basePrice.amount}
                formattedPrice={product.basePrice.format()}
                previewBaseImageUrl={previewBaseImageUrl}
                customizationConfig={customizationConfig.toJson()}
                productImages={productImages}
                labels={labels}
              />
            </div>
          </div>
        </div>
      </CustomizationDraftProvider>
    </div>
  );
}
