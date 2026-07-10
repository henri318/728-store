import { notFound } from 'next/navigation';
import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { prisma } from '@/shared/infrastructure/prisma';
import { getProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import type { ProductLocale } from '@/modules/products/presentation/components/product-locale-tabs';
import { ProductForm } from '../../product-form';

export default async function SellerProductEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  const session = await container.getSession().getSession();
  const seller = session?.id
    ? await container.getSellerRepository().findByUserId(session.id)
    : null;

  if (!seller) {
    notFound();
  }

  const product = await container.getProductRepository().findById(id, locale);
  if (!product || product.sellerId !== seller.sellerId.value) {
    notFound();
  }

  const customizationConfig =
    product.customizationConfig?.toJson() ??
    ProductCustomizationConfig.default().toJson();

  return (
    <ProductForm
      locale={locale}
      mode="edit"
      productId={id}
      categories={categories}
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
