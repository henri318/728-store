export interface ProductFormLabels {
  title: string;
  backToProducts: string;
  nameLabel: string;
  descriptionLabel: string;
  priceLabel: string;
  submit: string;
  saved: string;
  error: string;
  unsavedChanges?: {
    title: string;
    message: string;
    leave: string;
    stay: string;
  };
  missingTranslationNameError: string;
  localeTabs: {
    es: string;
    cat: string;
  };
  translationSection: {
    title: string;
    hint: string;
    nameLabel: string;
    descriptionLabel: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    tagsAddLabel: string;
    tagsEmptyLabel: string;
    sizesLabel: string;
    sizesPlaceholder: string;
    sizesAddLabel: string;
    sizesEmptyLabel: string;
    designChangeDescriptionLabel: string;
    designChangeDescriptionHelp: string;
    designChangeDescriptionPlaceholder: string;
  };
  customization: {
    label: string;
    hint: string;
    editor: {
      sizeOptionsLabel: string;
      sizeOptionsPlaceholder: string;
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
    moveUpLabel: string;
    moveDownLabel: string;
    uploadingLabel: string;
    emptyState: string;
    uploadError: string;
    defaultPhotoName: string;
    buckets: {
      cover: {
        title: string;
        hint: string;
        addPhotoLabel: string;
        emptyState: string;
        noCoverPlaceholder: string;
      };
      showcase: {
        title: string;
        hint: string;
        addPhotoLabel: string;
        emptyState: string;
        posterLabel: string;
        posterPlaceholder: string;
      };
      customizableBase: {
        title: string;
        hint: string;
        addPhotoLabel: string;
        emptyState: string;
      };
    };
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
    submit: (mode === 'create'
      ? sd.createProduct
      : sd.editProductSubmit) as string,
    saved: sd.productSaved as string,
    error: sd.productFormError as string,
    unsavedChanges: {
      title: dict.common.unsavedChangesTitle,
      message: dict.common.unsavedChangesMessage,
      leave: dict.common.unsavedChangesLeave,
      stay: dict.common.unsavedChangesStay,
    },
    missingTranslationNameError:
      sd.productMissingTranslationNameError as string,
    localeTabs: {
      es: (sd.productLocaleTabsEsLabel ?? 'ES') as string,
      cat: (sd.productLocaleTabsCatLabel ?? 'CAT') as string,
    },
    translationSection: {
      title: sd.productTranslationSectionTitle as string,
      hint: sd.productTranslationSectionHint as string,
      nameLabel: sd.productTranslationNameLabel as string,
      descriptionLabel: sd.productTranslationDescriptionLabel as string,
      tagsLabel: sd.productTranslationTagsLabel as string,
      tagsPlaceholder: sd.productTranslationTagsPlaceholder as string,
      tagsAddLabel: sd.productTranslationTagsAddLabel as string,
      tagsEmptyLabel: sd.productTranslationTagsEmptyLabel as string,
      sizesLabel: sd.productTranslationSizesLabel as string,
      sizesPlaceholder: sd.productTranslationSizesPlaceholder as string,
      sizesAddLabel: sd.productTranslationSizesAddLabel as string,
      sizesEmptyLabel: sd.productTranslationSizesEmptyLabel as string,
      designChangeDescriptionLabel:
        sd.productTranslationDesignChangeDescriptionLabel as string,
      designChangeDescriptionHelp:
        sd.productTranslationDesignChangeDescriptionHelp as string,
      designChangeDescriptionPlaceholder:
        sd.productTranslationDesignChangeDescriptionPlaceholder as string,
    },
    customization: {
      label: sd.productCustomizationConfigLabel as string,
      hint: sd.productCustomizationConfigHint as string,
      editor: {
        sizeOptionsLabel: sd.productCustomizationSizeOptionsLabel as string,
        sizeOptionsPlaceholder:
          sd.productCustomizationSizeOptionsPlaceholder as string,
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
      moveUpLabel: sd.productPhotoMoveUpLabel as string,
      moveDownLabel: sd.productPhotoMoveDownLabel as string,
      uploadingLabel: dict.common.customizationUploading,
      emptyState: sd.productPhotosEmptyState as string,
      uploadError: sd.productPhotosUploadError as string,
      defaultPhotoName: sd.productPhotoDefaultName as string,
      buckets: {
        cover: {
          title: sd.productPhotoBucketsCoverTitle as string,
          hint: sd.productPhotoBucketsCoverHint as string,
          addPhotoLabel: sd.productPhotoBucketsCoverAddLabel as string,
          emptyState: sd.productPhotoBucketsCoverEmptyState as string,
          noCoverPlaceholder:
            sd.productPhotoBucketsCoverNoCoverPlaceholder as string,
        },
        showcase: {
          title: sd.productPhotoBucketsShowcaseTitle as string,
          hint: sd.productPhotoBucketsShowcaseHint as string,
          addPhotoLabel: sd.productPhotoBucketsShowcaseAddLabel as string,
          emptyState: sd.productPhotoBucketsShowcaseEmptyState as string,
          posterLabel: sd.productPhotoBucketsShowcasePosterLabel as string,
          posterPlaceholder:
            sd.productPhotoBucketsShowcasePosterPlaceholder as string,
        },
        customizableBase: {
          title: sd.productPhotoBucketsCustomizableBaseTitle as string,
          hint: sd.productPhotoBucketsCustomizableBaseHint as string,
          addPhotoLabel:
            sd.productPhotoBucketsCustomizableBaseAddLabel as string,
          emptyState:
            sd.productPhotoBucketsCustomizableBaseEmptyState as string,
        },
      },
    },
  };
}
