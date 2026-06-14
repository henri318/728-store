import 'server-only';

const dictionaries: any = {
  es: () => import('./locales/es.json').then((module) => module.default),
  cat: () => import('./locales/cat.json').then((module) => module.default),
};

export const getDictionary = async (locale: 'es' | 'cat') => {
  return dictionaries[locale] ? dictionaries[locale]() : dictionaries.es();
};
