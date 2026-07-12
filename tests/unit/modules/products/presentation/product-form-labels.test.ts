import { describe, expect, it } from 'vitest';
import { getProductFormLabels } from '@/modules/products/presentation/product-form-labels';
import es from '@/shared/i18n/locales/es.json';
import cat from '@/shared/i18n/locales/cat.json';

function makeDict(overrides: Record<string, unknown> = {}) {
  const sd: Record<string, string> = {
    createProductTitle: 'Crear producto',
    editProductTitle: 'Editar producto',
    backToProducts: 'Volver a productos',
    productNameLabel: 'Nombre',
    productDescriptionLabel: 'Descripción',
    productPriceLabel: 'Precio',
    createProduct: 'Crear',
    editProduct: 'Editar producto',
    editProductSubmit: 'Guardar',
    productSaved: 'Guardado',
    productFormError: 'Error',
    productMissingTranslationNameError:
      'Completa el nombre traducido de {locale} antes de guardar.',
    productCustomizationConfigLabel: 'Config',
    productCustomizationConfigHint: 'Hint',
    productCustomizationSizeOptionsLabel: 'Tallas',
    productCustomizationSizeOptionsPlaceholder: 'S, M, L',
    productCustomizationAllowPhotoDesignLabel: 'Foto',
    productCustomizationDesignChangeDescriptionLabel: 'Cambio',
    productCustomizationDesignChangeDescriptionPlaceholder: 'Desc',
    productCustomizationCategoryLabel: 'Cat',
    productCustomizationCategoryPlaceholder: 'Sel',
    productCustomizationTagsLabel: 'Tags',
    productCustomizationTagsPlaceholder: 'a, b',
    productCustomizationTagsHelp: 'Help',
    productCustomizationAddLabel: 'Add',
    productPhotosTitle: 'Fotos',
    productPhotosHint: 'Sube',
    addProductPhotos: 'Add fotos',
    productPhotoDisplayNameLabel: 'Nombre',
    productPhotoDisplayNamePlaceholder: 'Foto 1',
    productPhotoSelectForPreview: 'Preview',
    productPhotoRemoveLabel: 'Remove',
    productPhotoMoveUpLabel: 'Up',
    productPhotoMoveDownLabel: 'Down',
    productPhotosEmptyState: 'Empty',
    productPhotosUploadError: 'Error',
    productPhotoDefaultName: 'Foto',
    productPhotoBucketsCoverTitle: 'Portada',
    productPhotoBucketsCoverHint: 'Hint',
    productPhotoBucketsCoverAddLabel: 'Add',
    productPhotoBucketsCoverEmptyState: 'Empty',
    productPhotoBucketsCoverNoCoverPlaceholder: 'No cover',
    productPhotoBucketsShowcaseTitle: 'Escaparate',
    productPhotoBucketsShowcaseHint: 'Hint',
    productPhotoBucketsShowcaseAddLabel: 'Add',
    productPhotoBucketsShowcaseEmptyState: 'Empty',
    productPhotoBucketsShowcasePosterLabel: 'Poster',
    productPhotoBucketsShowcasePosterPlaceholder: 'https://...',
    productPhotoBucketsCustomizableBaseTitle: 'Base',
    productPhotoBucketsCustomizableBaseHint: 'Hint',
    productPhotoBucketsCustomizableBaseAddLabel: 'Add',
    productPhotoBucketsCustomizableBaseEmptyState: 'Empty',
    productPreviewTitle: 'Preview',
    productPreviewHint: 'Mockup',
    productPreviewSelectedLabel: 'Selected',
    productPreviewFallback: 'Choose',
    customizationPreview: 'Preview',
    customizationPreviewDisclaimer: 'Disclaimer',
    customizationPreviewUnavailable: 'Unavailable',
    customizationLimitedToDescription: 'Limited',
    statusDraft: 'Draft',
    statusActive: 'Active',
    statusArchived: 'Archived',
    statusEliminated: 'Eliminated',
    productLocaleTabsEsLabel: 'ES',
    productLocaleTabsCatLabel: 'CAT',
    productTranslationSectionTitle: 'Sección',
    productTranslationSectionHint: 'Hint',
    productTranslationNameLabel: 'Nombre',
    productTranslationDescriptionLabel: 'Descripción',
    productTranslationTagsLabel: 'Tags',
    productTranslationTagsPlaceholder: 'a, b',
    productTranslationTagsAddLabel: 'Add',
    productTranslationTagsEmptyLabel: 'Empty',
    productTranslationSizesLabel: 'Sizes',
    productTranslationSizesPlaceholder: 'S, M',
    productTranslationSizesAddLabel: 'Add',
    productTranslationSizesEmptyLabel: 'Empty',
    productTranslationDesignChangeDescriptionLabel: 'Desc',
    productTranslationDesignChangeDescriptionHelp: 'Help change',
    productTranslationDesignChangeDescriptionPlaceholder: 'Desc',
    ...overrides,
  };

  return {
    sellerDashboard: sd,
    common: { customizationUploading: 'Uploading...' },
  } as never;
}

describe('getProductFormLabels', () => {
  it('maps localeTabs from the dictionary', () => {
    const labels = getProductFormLabels(makeDict(), 'create');
    expect(labels.localeTabs).toEqual({ es: 'ES', cat: 'CAT' });
  });

  it('uses missingTranslationNameError from the dictionary', () => {
    const labels = getProductFormLabels(makeDict(), 'create');
    expect(labels.missingTranslationNameError).toBe(
      'Completa el nombre traducido de {locale} antes de guardar.',
    );
  });

  it('uses edit title when mode is edit', () => {
    const labels = getProductFormLabels(makeDict(), 'edit');
    expect(labels.title).toBe('Editar producto');
    expect(labels.submit).toBe('Guardar');
    expect(labels).not.toHaveProperty('save');
  });

  it.each([
    ['es', es, 'Guardar'],
    ['cat', cat, 'Desar'],
  ] as const)(
    'uses the localized Save submit label for %s edit forms',
    (_, dict, expected) => {
      expect(getProductFormLabels(dict, 'edit').submit).toBe(expected);
    },
  );

  it('maps the design-change help text and placeholder', () => {
    const labels = getProductFormLabels(makeDict(), 'edit');

    expect(labels.translationSection.designChangeDescriptionHelp).toBe(
      'Help change',
    );
    expect(labels.translationSection.designChangeDescriptionPlaceholder).toBe(
      'Desc',
    );
  });

  it('uses create title when mode is create', () => {
    const labels = getProductFormLabels(makeDict(), 'create');
    expect(labels.title).toBe('Crear producto');
    expect(labels.submit).toBe('Crear');
  });
});
