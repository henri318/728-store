import 'server-only';

import type { Dictionary } from './dictionary-context';

const dictionaries: Record<string, () => Promise<Dictionary>> = {
  es: () =>
    import('./locales/es.json').then((module) => module.default as Dictionary),
  cat: () =>
    import('./locales/cat.json').then((module) => module.default as Dictionary),
};

export const getDictionary = async (
  locale: 'es' | 'cat',
): Promise<Dictionary> => {
  return dictionaries[locale] ? dictionaries[locale]() : dictionaries.es();
};
