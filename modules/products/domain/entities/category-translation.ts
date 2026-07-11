export type CategoryLocale = 'es' | 'cat';

export interface CategoryTranslationEntity {
  readonly locale: CategoryLocale;
  readonly name: string;
}

function isCategoryLocale(locale: string): locale is CategoryLocale {
  return locale === 'es' || locale === 'cat';
}

export function resolveCategoryDisplay(
  translations: readonly { locale: string; name: string }[],
  locale: string,
): CategoryTranslationEntity | null {
  const validTranslations = translations.filter(
    (translation): translation is CategoryTranslationEntity =>
      isCategoryLocale(translation.locale),
  );

  return (
    (isCategoryLocale(locale)
      ? validTranslations.find((translation) => translation.locale === locale)
      : undefined) ??
    validTranslations.find((translation) => translation.locale === 'es') ??
    validTranslations[0] ??
    null
  );
}
