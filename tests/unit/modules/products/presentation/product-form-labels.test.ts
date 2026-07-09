import { describe, expect, it } from 'vitest';
import { getProductFormLabels } from '@/modules/products/presentation/product-form-labels';

const dict = {
  sellerDashboard: {
    createProductTitle: 'Crear producto',
    editProductTitle: 'Editar producto',
    backToProducts: 'Volver a productos',
    productNameLabel: 'Nombre',
    productDescriptionLabel: 'Descripción',
    productPriceLabel: 'Precio',
    createProduct: 'Crear',
    editProduct: 'Guardar',
    productSaved: 'Guardado',
    productFormError: 'Error',
    productMissingTranslationNameError:
      'Completa el nombre traducido de {locale} antes de guardar.',
    productCustomizationConfigLabel: 'Configuración',
    productCustomizationConfigHint: 'Configura el producto.',
    productCustomizationSizeOptionsLabel: 'Tallas',
    productCustomizationSizeOptionsPlaceholder: 'S, M, L',
    productCustomizationAllowPhotoDesignLabel: 'Permitir foto',
    productCustomizationDesignChangeDescriptionLabel: 'Cambio',
    productCustomizationDesignChangeDescriptionPlaceholder:
      'Describe el cambio',
    productCustomizationCategoryLabel: 'Categoría',
    productCustomizationCategoryPlaceholder: 'Selecciona',
    productCustomizationTagsLabel: 'Etiquetas',
    productCustomizationTagsPlaceholder: 'Verano, Regalo',
    productCustomizationTagsHelp: 'Separa por comas.',
    productCustomizationAddLabel: 'Añadir',
    productPhotosTitle: 'Fotos',
    productPhotosHint: 'Sube fotos.',
    addProductPhotos: 'Añadir fotos',
    productPhotoDisplayNameLabel: 'Nombre visible',
    productPhotoDisplayNamePlaceholder: 'Foto 1',
    productPhotoSelectForPreview: 'Vista previa',
    productPhotoRemoveLabel: 'Eliminar foto',
    productPhotosEmptyState: 'Sin fotos',
    productPhotosUploadError: 'Error al subir',
    productPhotoDefaultName: 'Foto',
    productPreviewTitle: 'Vista previa',
    productPreviewHint: 'Mockup.',
    productPreviewSelectedLabel: 'Seleccionada',
    productPreviewFallback: 'Elige una foto.',
    customizationPreview: 'Preview',
    customizationPreviewDisclaimer: 'Aviso.',
    customizationPreviewUnavailable: 'No disponible',
    customizationLimitedToDescription: 'Solo descripción.',
    statusDraft: 'Borrador',
    statusActive: 'Activo',
    statusArchived: 'Archivado',
    statusEliminated: 'Eliminado',
    productLocaleTabsEsLabel: 'ES',
    productLocaleTabsCatLabel: 'CAT',
    productTranslationSectionTitle: 'Contenido traducido',
    productTranslationSectionHint: 'Edita cada idioma por separado.',
    productTranslationNameLabel: 'Nombre',
    productTranslationDescriptionLabel: 'Descripción',
    productTranslationTagsLabel: 'Etiquetas',
    productTranslationTagsPlaceholder: 'ropa, verano',
    productTranslationTagsAddLabel: 'Añadir etiqueta',
    productTranslationTagsEmptyLabel: 'Aún no hay etiquetas',
    productTranslationSizesLabel: 'Tallas',
    productTranslationSizesPlaceholder: 'S, M, L',
    productTranslationSizesAddLabel: 'Añadir talla',
    productTranslationSizesEmptyLabel: 'Aún no hay tallas',
    productTranslationDesignChangeDescriptionLabel: 'Descripción del cambio',
    productTranslationDesignChangeDescriptionPlaceholder: 'Describe el cambio',
  },
  common: { customizationUploading: 'Subiendo...' },
} as const;

describe('getProductFormLabels', () => {
  it('includes locale tabs and translation section labels', () => {
    const labels = getProductFormLabels(dict as never, 'create');

    expect(labels.localeTabs).toEqual({ es: 'ES', cat: 'CAT' });
    expect(labels.translationSection).toEqual({
      title: 'Contenido traducido',
      hint: 'Edita cada idioma por separado.',
      nameLabel: 'Nombre',
      descriptionLabel: 'Descripción',
      tagsLabel: 'Etiquetas',
      tagsPlaceholder: 'ropa, verano',
      tagsAddLabel: 'Añadir etiqueta',
      tagsEmptyLabel: 'Aún no hay etiquetas',
      sizesLabel: 'Tallas',
      sizesPlaceholder: 'S, M, L',
      sizesAddLabel: 'Añadir talla',
      sizesEmptyLabel: 'Aún no hay tallas',
      designChangeDescriptionLabel: 'Descripción del cambio',
      designChangeDescriptionPlaceholder: 'Describe el cambio',
    });
    expect(labels.missingTranslationNameError).toBe(
      'Completa el nombre traducido de {locale} antes de guardar.',
    );
  });
});
