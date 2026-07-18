import type { ProductTranslationInput } from '@/modules/products/presentation/schemas/product-form-schema';
import type {
  FormState,
  LocaleTranslationState,
  ProductFormProps,
  SupportedLocale,
  TranslationMap,
} from './product-form-types';

export function normalizeLocale(value: string): SupportedLocale {
  return value === 'cat' ? 'cat' : 'es';
}

function createTranslationDraft(
  locale: SupportedLocale,
): LocaleTranslationState {
  return {
    locale,
    name: '',
    description: '',
    tags: [],
    sizes: [],
    designChangeDescription: null,
    photoLabels: {},
  };
}

export function normalizeTranslationDraft(
  locale: SupportedLocale,
  draft?: Partial<LocaleTranslationState>,
): LocaleTranslationState {
  return {
    ...createTranslationDraft(locale),
    ...draft,
    locale,
    tags: [...(draft?.tags ?? [])],
    sizes: [...(draft?.sizes ?? [])],
    designChangeDescription: draft?.designChangeDescription ?? null,
    photoLabels: draft?.photoLabels ? { ...draft.photoLabels } : {},
  };
}

export function cleanPhotoLabels(
  labels: Record<string, string> | undefined,
  photoIds: ReadonlySet<string>,
) {
  return Object.fromEntries(
    Object.entries(labels ?? {}).filter(([photoId]) => photoIds.has(photoId)),
  );
}

export function addPhotoLabels(
  translations: TranslationMap,
  photoIds: readonly string[],
): TranslationMap {
  if (photoIds.length === 0) return translations;

  return Object.fromEntries(
    Object.entries(translations).map(([locale, translation]) => [
      locale,
      {
        ...translation,
        photoLabels: {
          ...translation.photoLabels,
          ...Object.fromEntries(photoIds.map((photoId) => [photoId, ''])),
        },
      },
    ]),
  ) as TranslationMap;
}

export function removePhotoLabels(
  translations: TranslationMap,
  photoId: string,
): TranslationMap {
  return Object.fromEntries(
    Object.entries(translations).map(([locale, translation]) => {
      const photoLabels = { ...translation.photoLabels };
      delete photoLabels[photoId];
      return [locale, { ...translation, photoLabels }];
    }),
  ) as TranslationMap;
}

function hasInactiveTranslationContent(
  translation: LocaleTranslationState,
): boolean {
  return (
    translation.description.trim().length > 0 ||
    translation.tags.length > 0 ||
    translation.sizes.length > 0 ||
    (translation.designChangeDescription?.trim().length ?? 0) > 0 ||
    Object.keys(translation.photoLabels ?? {}).length > 0
  );
}

export function findTranslationWithMissingName(
  form: FormState,
): SupportedLocale | null {
  const active = form.translations[form.activeLocale];
  if (active.name.trim().length === 0) return form.activeLocale;

  return (
    Object.values(form.translations).find(
      (translation) =>
        translation.locale !== form.activeLocale &&
        translation.name.trim().length === 0 &&
        hasInactiveTranslationContent(translation),
    )?.locale ?? null
  );
}

export function buildTranslationMap(
  locale: SupportedLocale,
  initialValues: ProductFormProps['initialValues'],
): TranslationMap {
  const translations: TranslationMap = {
    es: createTranslationDraft('es'),
    cat: createTranslationDraft('cat'),
  };

  if (initialValues.translations?.length) {
    for (const draft of initialValues.translations) {
      translations[draft.locale] = normalizeTranslationDraft(
        draft.locale,
        draft,
      );
    }
    return translations;
  }

  const translation: ProductTranslationInput | undefined =
    initialValues.translation;
  translations[locale] = normalizeTranslationDraft(locale, {
    name: initialValues.name ?? '',
    description: initialValues.description ?? '',
    tags: translation?.tags ?? [],
    sizes: translation?.sizes ?? [],
    designChangeDescription: translation?.designChangeDescription ?? null,
    photoLabels: translation?.photoLabels ?? {},
  });
  return translations;
}
