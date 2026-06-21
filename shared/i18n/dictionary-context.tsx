'use client';

import { createContext, use } from 'react';
import type { ReactNode } from 'react';
import es from '@/shared/i18n/locales/es.json';

/**
 * Dictionary type: top-level keys are sections ("common", "auth", "profile"),
 * each containing string key-value pairs.
 */
export type Dictionary = Record<string, Record<string, string>>;

const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: ReactNode;
}) {
  return <DictionaryContext value={dict}>{children}</DictionaryContext>;
}

/**
 * Returns the current locale dictionary.
 * Must be used inside a <DictionaryProvider> (provided by the root layout).
 * Falls back to Spanish (es.json) when no provider is present — this keeps
 * tests working without requiring every test to wrap in a provider.
 */
export function useDictionary(): Dictionary {
  const dict = use(DictionaryContext);
  return dict ?? (es as Dictionary);
}
