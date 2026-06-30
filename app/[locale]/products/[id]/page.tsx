import Image from 'next/image';
import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import Link from 'next/link';
import { CustomizationExperience } from './customization-experience';
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
    return (
      <div>Error loading product details. Please check the server logs.</div>
    );
  }

  const getValue = (value: string | string[] | undefined): string | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

  const primaryImage = product.images?.[0] ?? null;
  const customizationConfig =
    product.customizationConfig ?? ProductCustomizationConfig.default();
  const previewBaseImageUrl =
    primaryImage?.url ?? customizationConfig.previewTemplateUrl ?? '';

  const initialDraft = {
    text: getValue(query.customizationText),
    color: getValue(query.customizationColor),
    size: getValue(query.customizationSize),
    imageUploadId: getValue(query.customizationImageUploadId),
    imageUrl: getValue(query.customizationImageUrl),
  };

  return (
    <div className={styles.container}>
      <Link href={`/${locale}`} className={styles.backLink}>
        ← {dict.common.home}
      </Link>
      <div className={styles.grid}>
        <section className={styles.visualCard} aria-label={product.displayName}>
          {previewBaseImageUrl ? (
            <div className={styles.visualFrame}>
              <Image
                src={previewBaseImageUrl}
                alt={primaryImage?.alt ?? product.displayName}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 48vw"
                className={styles.productImage}
              />
              <div className={styles.visualWash} aria-hidden="true" />
            </div>
          ) : (
            <div
              className={styles.imagePlaceholder}
              role="img"
              aria-label={product.displayName}
            >
              <Image
                src="/img/decorations/formas-15.svg"
                alt=""
                fill
                aria-hidden="true"
                sizes="100vw"
                className={styles.placeholderArtwork}
              />
              <span className={styles.imagePlaceholderText}>
                Customizable preview coming soon
              </span>
            </div>
          )}
          <div className={styles.visualMeta}>
            <span className={styles.badge}>Customizable</span>
            <p className={styles.visualHint}>
              Seeded with a preview-ready product image.
            </p>
          </div>
        </section>

        <div className={styles.contentColumn}>
          <span className={styles.seller}>{product.sellerName}</span>
          <h1 className={styles.title}>{product.displayName}</h1>
          <p className={styles.description}>{product.displayDescription}</p>
          <p className={styles.price}>{product.basePrice.format()}</p>

          <div className={styles.customizationCard}>
            <CustomizationExperience
              productId={product.id}
              productName={product.displayName}
              sellerId={product.sellerId}
              sellerName={product.sellerName}
              price={product.basePrice.amount}
              previewBaseImageUrl={previewBaseImageUrl}
              customizationConfig={customizationConfig.toJson()}
              initialDraft={initialDraft}
              labels={{
                addToCart: dict.common.addToCart,
                removeFromCart: dict.common.removeFromCart,
                adding: '...',
                added: '✓',
                error: 'Error',
                customizationDesign: dict.common.customizationDesign,
                customizationPhrase: dict.common.customizationPhrase,
                customizationColor: dict.common.customizationColor,
                customizationSize: dict.common.customizationSize,
                customizationUpload: dict.common.customizationUpload,
                customizationReplaceImage:
                  dict.common.customizationReplaceImage,
                customizationRemoveImage: dict.common.customizationRemoveImage,
                customizationInvalidImage:
                  dict.common.customizationInvalidImage,
                customizationImageTooLarge:
                  dict.common.customizationImageTooLarge,
                customizationPreview: dict.common.customizationPreview,
                customizationPreviewDisclaimer:
                  dict.common.customizationPreviewDisclaimer,
                customizationPreviewUnavailable:
                  dict.common.customizationPreviewUnavailable,
                customizationLimitedToDescription:
                  dict.common.customizationLimitedToDescription,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
