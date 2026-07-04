import { notFound } from 'next/navigation';
import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { prisma } from '@/shared/infrastructure/prisma';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
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

  const translation =
    product.translations.find((item) => item.locale === locale) ??
    product.translations[0] ??
    null;

  return (
    <ProductForm
      locale={locale}
      mode="edit"
      productId={id}
      categories={categories}
      initialValues={{
        name: translation?.name ?? '',
        description: translation?.description ?? '',
        price: product.basePrice.amount,
        customizationConfig:
          product.customizationConfig?.toJson() ??
          ProductCustomizationConfig.default().toJson(),
        images: product.images.map((image, index) => ({
          url: image.url,
          alt:
            image.alt ??
            `${dict.sellerDashboard.productPhotoDefaultName} ${index + 1}`,
        })),
      }}
      labels={{
        title: dict.sellerDashboard.editProductTitle,
        backToProducts: dict.sellerDashboard.backToProducts,
        nameLabel: dict.sellerDashboard.productNameLabel,
        descriptionLabel: dict.sellerDashboard.productDescriptionLabel,
        priceLabel: dict.sellerDashboard.productPriceLabel,
        save: dict.sellerDashboard.editProduct,
        saved: dict.sellerDashboard.productSaved,
        error: dict.sellerDashboard.productFormError,
        customization: {
          label: dict.sellerDashboard.productCustomizationConfigLabel,
          hint: dict.sellerDashboard.productCustomizationConfigHint,
          editor: {
            sizeOptionsLabel:
              dict.sellerDashboard.productCustomizationSizeOptionsLabel,
            sizeOptionsPlaceholder:
              dict.sellerDashboard.productCustomizationSizeOptionsPlaceholder,
            allowPhotoDesignLabel:
              dict.sellerDashboard.productCustomizationAllowPhotoDesignLabel,
            designChangeDescriptionLabel:
              dict.sellerDashboard
                .productCustomizationDesignChangeDescriptionLabel,
            designChangeDescriptionPlaceholder:
              dict.sellerDashboard
                .productCustomizationDesignChangeDescriptionPlaceholder,
            categoryLabel:
              dict.sellerDashboard.productCustomizationCategoryLabel,
            categoryPlaceholder:
              dict.sellerDashboard.productCustomizationCategoryPlaceholder,
            tagsLabel: dict.sellerDashboard.productCustomizationTagsLabel,
            tagsPlaceholder:
              dict.sellerDashboard.productCustomizationTagsPlaceholder,
            tagsHelp: dict.sellerDashboard.productCustomizationTagsHelp,
          },
        },
        gallery: {
          title: dict.sellerDashboard.productPhotosTitle,
          hint: dict.sellerDashboard.productPhotosHint,
          addPhotoLabel: dict.sellerDashboard.addProductPhotos,
          photoDisplayNameLabel:
            dict.sellerDashboard.productPhotoDisplayNameLabel,
          photoDisplayNamePlaceholder:
            dict.sellerDashboard.productPhotoDisplayNamePlaceholder,
          selectForPreviewLabel:
            dict.sellerDashboard.productPhotoSelectForPreview,
          removePhotoLabel: dict.sellerDashboard.productPhotoRemoveLabel,
          uploadingLabel: dict.common.customizationUploading,
          emptyState: dict.sellerDashboard.productPhotosEmptyState,
          uploadError: dict.sellerDashboard.productPhotosUploadError,
          defaultPhotoName: dict.sellerDashboard.productPhotoDefaultName,
        },
      }}
    />
  );
}
