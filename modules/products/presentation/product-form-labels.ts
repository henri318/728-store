export interface ProductFormLabels {
  title: string;
  backToProducts: string;
  nameLabel: string;
  descriptionLabel: string;
  priceLabel: string;
  save: string;
  saved: string;
  error: string;
  customization: {
    label: string;
    hint: string;
    editor: {
      sizeOptionsLabel: string;
      sizeOptionsPlaceholder: string;
      allowPhotoDesignLabel: string;
      designChangeDescriptionLabel: string;
      designChangeDescriptionPlaceholder: string;
      categoryLabel: string;
      categoryPlaceholder: string;
      tagsLabel: string;
      tagsPlaceholder: string;
      tagsHelp: string;
      addLabel: string;
    };
  };
  gallery: {
    title: string;
    hint: string;
    addPhotoLabel: string;
    photoDisplayNameLabel: string;
    photoDisplayNamePlaceholder: string;
    selectForPreviewLabel: string;
    removePhotoLabel: string;
    uploadingLabel: string;
    emptyState: string;
    uploadError: string;
    defaultPhotoName: string;
  };
}

import type { Dictionary } from '@/shared/i18n/dictionary-context';

export function getProductFormLabels(
  dict: Dictionary,
  mode: 'create' | 'edit',
): ProductFormLabels {
  const sd = dict.sellerDashboard;

  return {
    title: (mode === 'create'
      ? sd.createProductTitle
      : sd.editProductTitle) as string,
    backToProducts: sd.backToProducts as string,
    nameLabel: sd.productNameLabel as string,
    descriptionLabel: sd.productDescriptionLabel as string,
    priceLabel: sd.productPriceLabel as string,
    save: (mode === 'create' ? sd.createProduct : sd.editProduct) as string,
    saved: sd.productSaved as string,
    error: sd.productFormError as string,
    customization: {
      label: sd.productCustomizationConfigLabel as string,
      hint: sd.productCustomizationConfigHint as string,
      editor: {
        sizeOptionsLabel: sd.productCustomizationSizeOptionsLabel as string,
        sizeOptionsPlaceholder:
          sd.productCustomizationSizeOptionsPlaceholder as string,
        allowPhotoDesignLabel:
          sd.productCustomizationAllowPhotoDesignLabel as string,
        designChangeDescriptionLabel:
          sd.productCustomizationDesignChangeDescriptionLabel as string,
        designChangeDescriptionPlaceholder:
          sd.productCustomizationDesignChangeDescriptionPlaceholder as string,
        categoryLabel: sd.productCustomizationCategoryLabel as string,
        categoryPlaceholder:
          sd.productCustomizationCategoryPlaceholder as string,
        tagsLabel: sd.productCustomizationTagsLabel as string,
        tagsPlaceholder: sd.productCustomizationTagsPlaceholder as string,
        tagsHelp: sd.productCustomizationTagsHelp as string,
        addLabel: sd.productCustomizationAddLabel as string,
      },
    },
    gallery: {
      title: sd.productPhotosTitle as string,
      hint: sd.productPhotosHint as string,
      addPhotoLabel: sd.addProductPhotos as string,
      photoDisplayNameLabel: sd.productPhotoDisplayNameLabel as string,
      photoDisplayNamePlaceholder:
        sd.productPhotoDisplayNamePlaceholder as string,
      selectForPreviewLabel: sd.productPhotoSelectForPreview as string,
      removePhotoLabel: sd.productPhotoRemoveLabel as string,
      uploadingLabel: dict.common.customizationUploading,
      emptyState: sd.productPhotosEmptyState as string,
      uploadError: sd.productPhotosUploadError as string,
      defaultPhotoName: sd.productPhotoDefaultName as string,
    },
  };
}
