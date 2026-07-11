'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextField } from '@/shared/ui/text-field';
import {
  CategoryLocaleTabs,
  type CategoryLocale,
} from '@/modules/products/presentation/components/category-locale-tabs';
import { DictionaryProvider } from '@/shared/i18n/dictionary-context';
import styles from './configuration-form.module.css';

export interface CategorySummary {
  id: string;
  displayName: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
  translations?: ReadonlyArray<{ locale: CategoryLocale; name: string }>;
}

interface ConfigurationDict {
  common: {
    remove: string;
    required: string;
    genericError: string;
  };
  admin: {
    configuration: {
      title: string;
      description: string;
      label: string;
      placeholder: string;
      addLabel: string;
      emptyLabel: string;
      delete: string;
      createError: string;
      deleteError: string;
      validationError: string;
      duplicateError: string;
      inUseError: string;
      nameEsLabel: string;
      nameCatLabel: string;
      nameEsPlaceholder: string;
      nameCatPlaceholder: string;
      missingBothError: string;
      missingOneError: string;
    };
  };
}

interface ConfigurationFormProps {
  locale: string;
  dict: ConfigurationDict;
  initialCategories: CategorySummary[];
}

function sortCategories(
  categories: CategorySummary[],
  locale: string,
): CategorySummary[] {
  return categories.toSorted((a, b) =>
    a.displayName.localeCompare(b.displayName, locale),
  );
}

function statusMessage(
  operation: 'create' | 'delete',
  status: number,
  dict: ConfigurationDict,
): string {
  if (operation === 'create' && status === 400) {
    return dict.admin.configuration.validationError;
  }

  if (operation === 'create' && status === 409) {
    return dict.admin.configuration.duplicateError;
  }

  if (operation === 'delete' && status === 409) {
    return dict.admin.configuration.inUseError;
  }

  return operation === 'create'
    ? dict.admin.configuration.createError
    : dict.admin.configuration.deleteError;
}

export function ConfigurationForm({
  locale,
  dict,
  initialCategories,
}: ConfigurationFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(() =>
    sortCategories(initialCategories, locale),
  );
  const [error, setError] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState<CategoryLocale>('es');
  const [namesByLocale, setNamesByLocale] = useState<
    Record<CategoryLocale, string>
  >({ es: '', cat: '' });
  const createCategory = async () => {
    const nameEs = namesByLocale.es.trim();
    const nameCat = namesByLocale.cat.trim();
    if (!nameEs && !nameCat) {
      setError(dict.admin.configuration.missingBothError);
      return;
    }
    if (!nameEs || !nameCat) {
      setError(dict.admin.configuration.missingOneError);
      return;
    }

    setError(null);
    let nextCategories = [...categories];
    let hasPersistedChanges = false;

    const synchronizePartialResult = () => {
      if (!hasPersistedChanges) {
        return;
      }

      setCategories(nextCategories);
      router.refresh();
    };

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nameEs, nameCat }),
      });

      if (!response.ok) {
        setError(statusMessage('create', response.status, dict));
        return;
      }

      const created = (await response.json()) as CategorySummary;
      nextCategories = sortCategories(
        [...categories, { ...created, displayName: nameEs }],
        locale,
      );
      hasPersistedChanges = true;

      setCategories(nextCategories);
      router.refresh();
      setNamesByLocale({ es: '', cat: '' });
    } catch {
      synchronizePartialResult();
      setError(dict.common.genericError);
    }
  };

  return (
    <DictionaryProvider dict={dict as never}>
      <section
        className={styles.card}
        aria-label={dict.admin.configuration.title}
      >
        <div className={styles.content}>
          <>
            <div className={styles.formHeader}>
              <CategoryLocaleTabs
                value={activeLocale}
                onChange={setActiveLocale}
                labels={{
                  es: dict.admin.configuration.nameEsLabel,
                  cat: dict.admin.configuration.nameCatLabel,
                }}
              />
            </div>
            <TextField
              label={
                activeLocale === 'es'
                  ? dict.admin.configuration.nameEsLabel
                  : dict.admin.configuration.nameCatLabel
              }
              placeholder={
                activeLocale === 'es'
                  ? dict.admin.configuration.nameEsPlaceholder
                  : dict.admin.configuration.nameCatPlaceholder
              }
              value={namesByLocale[activeLocale]}
              onChange={(value) =>
                setNamesByLocale((current) => ({
                  ...current,
                  [activeLocale]: value,
                }))
              }
              required
            />
            <button type="button" onClick={() => void createCategory()}>
              {dict.admin.configuration.addLabel}
            </button>
            <ul aria-label={dict.admin.configuration.label}>
              {categories.map((category) => (
                <li key={category.id}>{category.displayName}</li>
              ))}
            </ul>
          </>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <p className={styles.helper}>
            {dict.admin.configuration.description}
          </p>

          <input type="hidden" value={locale} aria-hidden="true" readOnly />
        </div>
      </section>
    </DictionaryProvider>
  );
}
