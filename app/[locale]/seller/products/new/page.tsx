import { getDictionary } from '@/shared/i18n/get-dictionary';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductForm } from '../product-form';

export default async function SellerProductCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  return (
    <ProductForm
      locale={locale}
      mode="create"
      initialValues={{
        name: '',
        description: '',
        price: 1,
        status: ProductStatus.DRAFT,
        customizationConfig: '',
      }}
      labels={{
        title: dict.sellerDashboard.createProductTitle,
        backToProducts: dict.sellerDashboard.backToProducts,
        nameLabel: dict.sellerDashboard.productNameLabel,
        descriptionLabel: dict.sellerDashboard.productDescriptionLabel,
        priceLabel: dict.sellerDashboard.productPriceLabel,
        statusLabel: dict.sellerDashboard.productStatusLabel,
        customizationConfigLabel:
          dict.sellerDashboard.productCustomizationConfigLabel,
        customizationConfigHint:
          dict.sellerDashboard.productCustomizationConfigHint,
        save: dict.sellerDashboard.createProduct,
        saved: dict.sellerDashboard.productSaved,
        error: dict.sellerDashboard.productFormError,
        statusDraft: dict.sellerDashboard.statusDraft,
        statusActive: dict.sellerDashboard.statusActive,
        statusArchived: dict.sellerDashboard.statusArchived,
        statusEliminated: dict.sellerDashboard.statusEliminated,
      }}
    />
  );
}
