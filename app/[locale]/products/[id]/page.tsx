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
        <div className={styles.imagePlaceholder}>
          <span className={styles.imagePlaceholderText}>
            Product Image Placeholder
          </span>
        </div>
        <div>
          <h1>{product.displayName}</h1>
          <p className={styles.description}>{product.displayDescription}</p>
          <p className={styles.price}>{product.basePrice.format()}</p>
          <p className={styles.seller}>Seller: {product.sellerName}</p>

          <div className={styles.addToCart}>
            <CustomizationExperience
              productId={product.id}
              productName={product.displayName}
              sellerId={product.sellerId}
              sellerName={product.sellerName}
              price={product.basePrice.amount}
              previewBaseImageUrl={product.images?.[0]?.url ?? ''}
              customizationConfig={
                product.customizationConfig ??
                ProductCustomizationConfig.default()
              }
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
