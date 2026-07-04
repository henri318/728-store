import { getDictionary } from '@/shared/i18n/get-dictionary';
import { prisma } from '@/shared/infrastructure/prisma';
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
      labels={{
        title: dict.sellerDashboard.createProductTitle,
        backToProducts: dict.sellerDashboard.backToProducts,
        nameLabel: dict.sellerDashboard.productNameLabel,
        descriptionLabel: dict.sellerDashboard.productDescriptionLabel,
        priceLabel: dict.sellerDashboard.productPriceLabel,
        save: dict.sellerDashboard.createProduct,
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
