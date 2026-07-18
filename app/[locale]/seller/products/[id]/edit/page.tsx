import { notFound } from 'next/navigation';
import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { getProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import type { ProductLocale } from '@/modules/products/presentation/components/product-locale-tabs';
import { ProductForm } from '../../product-form';
import { NotFoundError } from '@/shared/kernel/app-error';
import type { SellerProductFormData } from '@/modules/products/application/get-seller-product-form-use-case';

export default async function SellerProductEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
  const session = await container.getSession().getSession();
  if (!session?.id) {
    notFound();
  }
  let formData: SellerProductFormData;

  try {
    formData = await container.getSellerProductFormUseCase().execute({
      userId: session.id,
      productId: id,
      locale: locale as 'es' | 'cat',
    });
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const { product, categories: categoryOptions } = formData;

  const customizationConfig =
    product.customizationConfig?.toJson() ??
    ProductCustomizationConfig.default().toJson();

  return (
    <ProductForm
      locale={locale}
      mode="edit"
      productId={id}
      categories={categoryOptions}
      initialValues={{
        price: product.basePrice.amount,
        translations: [
          ...product.translations.map((translation) => {
            const translationLocale: ProductLocale =
              translation.locale === 'cat' ? 'cat' : 'es';

            return {
              locale: translationLocale,
              name: translation.name,
              description: translation.description ?? '',
              tags: [...(translation.tags ?? [])],
              sizes: [...(translation.sizes ?? [])],
              designChangeDescription:
                translation.designChangeDescription ?? null,
              photoLabels: translation.photoLabels
                ? { ...translation.photoLabels }
                : {},
            };
          }),
        ],
        customizationConfig: {
          ...customizationConfig,
        },
        images: {
          cover:
            product.images.find(
              (image) => image.purpose === ProductImagePurpose.COVER,
            ) ?? null,
          showcase: product.images.filter(
            (image) => image.purpose === ProductImagePurpose.SHOWCASE,
          ),
          customizableBase: product.images.filter(
            (image) => image.purpose === ProductImagePurpose.CUSTOMIZABLE_BASE,
          ),
        },
      }}
      labels={getProductFormLabels(dict, 'edit')}
    />
  );
}
