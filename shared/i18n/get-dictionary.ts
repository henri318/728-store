import 'server-only';

import type { Dictionary } from './dictionary-context';
import es from './locales/es.json';
import cat from './locales/cat.json';

const dictionaries: Record<string, () => Promise<Dictionary>> = {
  es: async () => es as unknown as Dictionary,
  cat: async () => cat as unknown as Dictionary,
};

export const getDictionary = async (
  locale: 'es' | 'cat',
): Promise<Dictionary> => {
  return locale in dictionaries ? dictionaries[locale]() : dictionaries.es();
};
