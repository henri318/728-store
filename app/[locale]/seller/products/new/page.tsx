import { getDictionary } from '@/shared/i18n/get-dictionary';
import { prisma } from '@/shared/infrastructure/prisma';
import { getProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductForm } from '../product-form';
import { resolveCategoryDisplay } from '@/modules/products/domain/entities/category-translation';

export default async function SellerProductCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
  const categories = await prisma.category.findMany({
    include: { translations: true },
  });
  const categoryOptions = categories
    .map((category) => ({
      id: category.id,
      name: resolveCategoryDisplay(category.translations, locale)?.name ?? '',
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <ProductForm
      locale={locale}
      mode="create"
      categories={categoryOptions}
      initialValues={{
        price: 1,
        translations: [
          {
            locale: 'es',
            name: '',
            description: '',
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
          {
            locale: 'cat',
            name: '',
            description: '',
            tags: [],
            sizes: [],
            designChangeDescription: null,
          },
        ],
        customizationConfig: ProductCustomizationConfig.default().toJson(),
        images: {
          cover: null,
          showcase: [],
          customizableBase: [],
        },
      }}
      labels={getProductFormLabels(dict, 'create')}
    />
  );
}
