import { getDictionary } from '@/shared/i18n/get-dictionary';
import { prisma } from '@/shared/infrastructure/prisma';
import { getProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductForm } from '../product-form';

export default async function SellerProductCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <ProductForm
      locale={locale}
      mode="create"
      categories={categories}
      initialValues={{
        name: '',
        description: '',
        price: 1,
        customizationConfig: ProductCustomizationConfig.default().toJson(),
        images: [],
      }}
      labels={getProductFormLabels(dict, 'create')}
    />
  );
}
