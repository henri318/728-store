export const DEFAULT_EMAIL_LOCALE = 'es' as const;

export function normalizeEmailLocale(
  _locale: string | null | undefined,
): typeof DEFAULT_EMAIL_LOCALE {
  return DEFAULT_EMAIL_LOCALE;
}
