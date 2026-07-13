import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { serializeProduct } from '@/modules/products/presentation/product-response';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { resolveProductViewerContext } from '@/shared/authorization/product-viewer-context';
import { APP_BASE_URL } from '@/shared/kernel/config';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CustomizationExperience,
  type CustomizationExperienceLabels,
} from './customization-experience';
import styles from './page.module.css';
import type { ProductShowcaseMedia } from './product-showcase-gallery';

async function getPublicProduct(id: string, locale: string) {
  const repository = container.getProductRepository();
  return new GetProductByIdUseCase(repository).execute(id, locale, 'public');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  let product;

  try {
    product = await getPublicProduct(id, locale);
  } catch {
    notFound();
  }

  const canonical = `${APP_BASE_URL}/${locale}/products/${id}`;
  const defaultUrl = `${APP_BASE_URL}/es/products/${id}`;
  const cover = product.images.find((image) => image.purpose === 'COVER');
  const image = cover ? new URL(cover.url, APP_BASE_URL).href : undefined;

  return {
    title: product.displayName,
    description: product.displayDescription,
    alternates: {
      canonical,
      languages: {
        es: defaultUrl,
        ca: `${APP_BASE_URL}/cat/products/${id}`,
        'x-default': defaultUrl,
      },
    },
    openGraph: {
      url: canonical,
      title: product.displayName,
      description: product.displayDescription,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.displayName,
      description: product.displayDescription,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  let product;

  try {
    product = await getPublicProduct(id, locale);
  } catch {
    notFound();
  }

  const viewerContext = await resolveProductViewerContext(
    product,
    locale as 'es' | 'cat',
  );
  const view = serializeProduct(product, { publicView: true });
  const isDesigner = viewerContext.viewerRole === 'DESIGNER';
  const customizationLabels = {
    addToCart: dict.common.addToCart,
    removeFromCart: dict.common.removeFromCart,
    adding: dict.common.addingToCart,
    added: dict.common.addedToCart,
    error: dict.common.cartError,
    increaseQuantity: dict.common.increaseQuantity,
    decreaseQuantity: dict.common.decreaseQuantity,
    saveDesign: dict.common.saveDesign,
    customizeProduct: dict.common.customizeProduct,
    addWithoutCustomization: dict.common.addWithoutCustomization,
    alreadyInCartDifferent: dict.common.alreadyInCartDifferent,
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
    customizationPreviewUnavailable:
      dict.common.customizationPreviewUnavailable,
    customizationLimitedToDescription:
      dict.common.customizationLimitedToDescription,
    customizationPreviewDisclaimer: dict.common.customizationPreviewDisclaimer,
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
    customizationTextTooLong: dict.common.customizationTextTooLong,
    customizationColorTooLong: dict.common.customizationColorTooLong,
    customizationSizeTooLong: dict.common.customizationSizeTooLong,
    customizationInvalidImageUrl: dict.common.customizationInvalidImageUrl,
    mediaPrevious: dict.orders?.previous ?? 'Previous',
    mediaNext: dict.orders?.next ?? 'Next',
    goToEdit: dict.common.goToEdit,
    unsavedChangesTitle: dict.common.unsavedChangesTitle,
    unsavedChangesMessage: dict.common.unsavedChangesMessage,
    unsavedChangesLeave: dict.common.unsavedChangesLeave,
    unsavedChangesStay: dict.common.unsavedChangesStay,
  } satisfies CustomizationExperienceLabels;
  customizationLabels.customizationDesign = isDesigner
    ? dict.common.customizationDesignDesigner
    : dict.common.customizationDesignCustomer;
  customizationLabels.customizationPhrase = isDesigner
    ? dict.common.customizationPhraseDesigner
    : dict.common.customizationPhraseCustomer;
  const publicMedia: ProductShowcaseMedia[] = [
    ...(view.cover
      ? [
          {
            id: view.cover.id,
            url: view.cover.url,
            alt: view.cover.alt ?? product.displayName,
            mimeType: view.cover.mimeType,
            posterUrl: view.cover.posterUrl,
          },
        ]
      : []),
    ...view.showcase.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt ?? product.displayName,
      mimeType: image.mimeType,
      posterUrl: image.posterUrl,
    })),
  ];
  const customizableBaseImages = view.customizableBase.map((image) => ({
    url: image.url,
    alt: image.alt ?? product.displayName,
    purpose: image.purpose,
  }));
  const sizes = product.displayTranslation?.sizes?.length
    ? [...product.displayTranslation.sizes]
    : undefined;

  return (
    <div className={styles.container}>
      <Link href={`/${locale}`} className={styles.backLink}>
        ← {dict.common.home}
      </Link>
      <div className={styles.detailLayout}>
        <CustomizationExperience
          productId={product.id}
          productName={product.displayName}
          productDescription={product.displayDescription}
          designChangeDescription={
            product.displayTranslation?.designChangeDescription ?? null
          }
          sellerId={product.sellerId}
          sellerName={product.sellerName}
          price={product.basePrice.amount}
          formattedPrice={product.basePrice.format()}
          previewBaseImageUrl={customizableBaseImages[0]?.url ?? ''}
          customizationConfig={product.customizationConfig?.toJson() ?? null}
          sizes={sizes}
          productImages={customizableBaseImages}
          publicMedia={publicMedia}
          labels={customizationLabels}
          viewerContext={viewerContext}
        />
      </div>
    </div>
  );
}
