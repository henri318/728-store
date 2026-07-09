'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TagList } from '@/shared/ui/tag-list';
import { DictionaryProvider } from '@/shared/i18n/dictionary-context';
import styles from './configuration-form.module.css';

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
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
    };
  };
}

interface ConfigurationFormProps {
  locale: string;
  dict: ConfigurationDict;
  initialCategories: CategorySummary[];
}

function sortCategories(categories: CategorySummary[]): CategorySummary[] {
  return categories.toSorted((a, b) => a.name.localeCompare(b.name));
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
    sortCategories(initialCategories),
  );
  const [error, setError] = useState<string | null>(null);

  const names = useMemo(
    () => categories.map((category) => category.name),
    [categories],
  );
  const nameSet = useMemo(() => new Set(names), [names]);

  const persistNextState = async (nextNames: string[]) => {
    const nextNameSet = new Set(nextNames);
    const additions = nextNames.filter((name) => !nameSet.has(name));
    const removals = categories.filter(
      (category) => !nextNameSet.has(category.name),
    );

    if (additions.length === 0 && removals.length === 0) {
      return;
    }

    setError(null);

    try {
      let nextCategories = [...categories];

      for (const name of additions) {
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          setError(statusMessage('create', response.status, dict));
          return;
        }

        const created = (await response.json()) as CategorySummary;
        nextCategories = sortCategories([...nextCategories, created]);
      }

      for (const removed of removals) {
        const response = await fetch(`/api/admin/categories/${removed.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          setError(statusMessage('delete', response.status, dict));
          return;
        }

        nextCategories = nextCategories.filter(
          (category) => category.id !== removed.id,
        );
      }

      setCategories(nextCategories);
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
          <TagList
            label={dict.admin.configuration.label}
            placeholder={dict.admin.configuration.placeholder}
            addLabel={dict.admin.configuration.addLabel}
            emptyLabel={dict.admin.configuration.emptyLabel}
            value={categories.length > 0 ? names : null}
            onChange={(next) => {
              void persistNextState(next ?? []);
            }}
          />

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
