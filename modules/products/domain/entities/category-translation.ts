export type CategoryLocale = 'es' | 'cat';

export interface CategoryTranslationEntity {
  readonly locale: CategoryLocale;
  readonly name: string;
}

export function resolveCategoryDisplay(
  translations: readonly { locale: string; name: string }[],
  locale: string,
): CategoryTranslationEntity | null {
  return (
    (translations.find((translation) => translation.locale === locale) as
      CategoryTranslationEntity | undefined) ??
    (translations.find((translation) => translation.locale === 'es') as
      CategoryTranslationEntity | undefined) ??
    (translations[0] as CategoryTranslationEntity | undefined) ??
    null
  );
}
