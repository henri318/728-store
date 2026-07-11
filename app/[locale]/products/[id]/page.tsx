import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { serializeProduct } from '@/modules/products/presentation/product-response';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import Link from 'next/link';
import {
  CustomizationExperience,
  type CustomizationExperienceLabels,
} from './customization-experience';
import styles from './page.module.css';
import type { ProductShowcaseMedia } from './product-showcase-gallery';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  const repository = container.getProductRepository();
  const useCase = new GetProductByIdUseCase(repository);

  let product = null;
  let isError = false;

  try {
    product = await useCase.execute(id, locale);
  } catch {
    isError = true;
  }

  if (isError || !product) {
    return <div>{dict.common.productDetailsError}</div>;
  }

  const view = serializeProduct(product);
  const customizationLabels: CustomizationExperienceLabels = {
    ...dict.common,
    adding: dict.common.addingToCart,
    added: dict.common.addedToCart,
    error: dict.common.cartError,
    mediaPrevious: dict.orders?.previous ?? 'Previous',
    mediaNext: dict.orders?.next ?? 'Next',
  };
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
        />
      </div>
    </div>
  );
}
