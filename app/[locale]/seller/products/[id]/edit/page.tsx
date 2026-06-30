import { notFound } from 'next/navigation';
import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { ProductForm } from '../../product-form';

export default async function SellerProductEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
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

  const translation =
    product.translations.find((item) => item.locale === locale) ??
    product.translations[0] ??
    null;

  return (
    <ProductForm
      locale={locale}
      mode="edit"
      productId={id}
      initialValues={{
        name: translation?.name ?? '',
        description: translation?.description ?? '',
        price: product.basePrice.amount,
        status: product.status ?? ProductStatus.DRAFT,
        customizationConfig: product.customizationConfig
          ? JSON.stringify(product.customizationConfig.toJson(), null, 2)
          : '',
      }}
      labels={{
        title: dict.sellerDashboard.editProductTitle,
        backToProducts: dict.sellerDashboard.backToProducts,
        nameLabel: dict.sellerDashboard.productNameLabel,
        descriptionLabel: dict.sellerDashboard.productDescriptionLabel,
        priceLabel: dict.sellerDashboard.productPriceLabel,
        statusLabel: dict.sellerDashboard.productStatusLabel,
        customizationConfigLabel:
          dict.sellerDashboard.productCustomizationConfigLabel,
        customizationConfigHint:
          dict.sellerDashboard.productCustomizationConfigHint,
        save: dict.sellerDashboard.editProduct,
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
