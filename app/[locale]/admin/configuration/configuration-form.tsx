'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextField } from '@/shared/ui/text-field';
import { Button } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { type CategoryLocale } from '@/modules/products/presentation/components/category-locale-tabs';
import { resolveCategoryDisplay } from '@/modules/products/domain/entities/category-translation';
import { DictionaryProvider } from '@/shared/i18n/dictionary-context';
import styles from './configuration-form.module.css';
import { CategoryListItem } from './category-list-item';

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
      updateError: string;
      submitSave: string;
      edit: string;
      cancel: string;
      confirmDelete: string;
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
  operation: 'create' | 'update' | 'delete',
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

  if (operation === 'update') return dict.admin.configuration.updateError;
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
        [
          ...categories,
          {
            ...created,
            displayName:
              resolveCategoryDisplay(created.translations ?? [], locale)
                ?.name ?? '',
          },
        ],
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

  const updateCategory = async (
    category: CategorySummary,
    names: Record<CategoryLocale, string>,
  ) => {
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nameEs: names.es, nameCat: names.cat }),
      });
      if (!response.ok) {
        setError(statusMessage('update', response.status, dict));
        return;
      }
      const updated = (await response.json()) as CategorySummary;
      setCategories((current) =>
        sortCategories(
          current.map((item) =>
            item.id === category.id
              ? {
                  ...updated,
                  id: category.id,
                  displayName:
                    resolveCategoryDisplay(updated.translations ?? [], locale)
                      ?.name ?? '',
                }
              : item,
          ),
          locale,
        ),
      );
      router.refresh();
    } catch {
      setError(dict.common.genericError);
    }
  };

  const deleteCategory = async (category: CategorySummary) => {
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setError(statusMessage('delete', response.status, dict));
        return;
      }
      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );
      router.refresh();
    } catch {
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
            <TextField
              label={dict.admin.configuration.nameEsLabel}
              placeholder={dict.admin.configuration.nameEsPlaceholder}
              value={namesByLocale.es}
              onChange={(value) =>
                setNamesByLocale((current) => ({ ...current, es: value }))
              }
              required
            />
            <TextField
              label={dict.admin.configuration.nameCatLabel}
              placeholder={dict.admin.configuration.nameCatPlaceholder}
              value={namesByLocale.cat}
              onChange={(value) =>
                setNamesByLocale((current) => ({ ...current, cat: value }))
              }
              required
            />
            <div className={styles.addAction}>
              <Button type="button" onClick={() => void createCategory()}>
                {dict.admin.configuration.addLabel}
              </Button>
            </div>
            <DataTable<CategorySummary>
              columns={
                [
                  {
                    key: 'category',
                    header: dict.admin.configuration.label,
                    render: (category) => (
                      <CategoryListItem
                        category={category}
                        dict={dict.admin.configuration}
                        onSave={updateCategory}
                        onDelete={deleteCategory}
                      />
                    ),
                  },
                ] satisfies DataTableColumn<CategorySummary>[]
              }
              rows={categories}
              rowKey={(category) => category.id}
            />
          </>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <input type="hidden" value={locale} aria-hidden="true" readOnly />
        </div>
      </section>
    </DictionaryProvider>
  );
}
