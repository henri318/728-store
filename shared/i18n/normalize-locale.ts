const LOCALE_ALIASES: Record<string, string> = {
  cat: 'ca',
};

export function normalizeLocale(locale: string): string {
  return LOCALE_ALIASES[locale] ?? locale;
}
