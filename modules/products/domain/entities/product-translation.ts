export interface ProductTranslationEntity {
  locale: string;
  name: string;
  description: string | null;
  tags?: readonly string[];
  sizes?: readonly string[];
  designChangeDescription?: string | null;
  photoLabels?: Readonly<Record<string, string>>;
}

export function resolvePhotoLabel(
  translations: readonly ProductTranslationEntity[],
  photoId: string,
  locale: string,
): string {
  const active = translations.find(
    (translation) => translation.locale === locale,
  );
  const neutral = translations.find(
    (translation) => translation.locale === 'es',
  );
  return (
    active?.photoLabels?.[photoId] ?? neutral?.photoLabels?.[photoId] ?? ''
  );
}

export function resolveDisplay(
  translations: readonly ProductTranslationEntity[],
  locale: string,
): ProductTranslationEntity | null {
  if (translations.length === 0) {
    return null;
  }

  return (
    normalizeTranslation(pickTranslation(translations, locale)) ??
    normalizeTranslation(pickTranslation(translations, 'es')) ??
    normalizeTranslation(translations[0]) ??
    null
  );
}

function pickTranslation(
  translations: readonly ProductTranslationEntity[],
  locale: string,
): ProductTranslationEntity | null {
  return (
    translations.find((translation) => translation.locale === locale) ?? null
  );
}

function normalizeTranslation(
  translation: ProductTranslationEntity | null,
): ProductTranslationEntity | null {
  if (!translation) {
    return null;
  }

  return {
    ...translation,
    tags: translation.tags ?? [],
    sizes: translation.sizes ?? [],
    designChangeDescription: translation.designChangeDescription ?? null,
    photoLabels: translation.photoLabels ?? {},
  };
}
