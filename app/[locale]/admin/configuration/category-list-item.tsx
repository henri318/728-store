'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';
import type { CategoryLocale } from '@/modules/products/presentation/components/category-locale-tabs';
import type { CategorySummary } from './configuration-form';
import styles from './category-list-item.module.css';

interface CategoryListItemDict {
  edit: string;
  submitSave: string;
  cancel: string;
  delete: string;
  confirmDelete: string;
  nameEsLabel: string;
  nameCatLabel: string;
}

interface CategoryListItemProps {
  category: CategorySummary;
  dict: CategoryListItemDict;
  onSave: (
    category: CategorySummary,
    names: Record<CategoryLocale, string>,
  ) => Promise<void>;
  onDelete: (category: CategorySummary) => Promise<void>;
}

export function CategoryListItem({
  category,
  dict,
  onSave,
  onDelete,
}: CategoryListItemProps) {
  const [editing, setEditing] = useState(false);
  const [names, setNames] = useState<Record<CategoryLocale, string>>(() => ({
    es: category.translations?.find((item) => item.locale === 'es')?.name ?? '',
    cat:
      category.translations?.find((item) => item.locale === 'cat')?.name ?? '',
  }));

  const save = async () => {
    await onSave(category, names);
    setEditing(false);
  };

  const remove = async () => {
    if (globalThis.confirm(dict.confirmDelete)) await onDelete(category);
  };

  return (
    <div className={styles.item}>
      {editing ? (
        <div className={styles.editor}>
          <div className={styles.inlineInputs}>
            <TextField
              label={dict.nameEsLabel}
              value={names.es}
              onChange={(value) =>
                setNames((current) => ({ ...current, es: value }))
              }
            />
            <TextField
              label={dict.nameCatLabel}
              value={names.cat}
              onChange={(value) =>
                setNames((current) => ({ ...current, cat: value }))
              }
            />
          </div>
          <div
            className={styles.actions}
            role="group"
            aria-label="Category actions"
          >
            <Button type="button" onClick={() => void save()}>
              {dict.submitSave}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              {dict.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.row}>
          <span>{category.displayName}</span>
          <div
            className={styles.actions}
            role="group"
            aria-label="Category actions"
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(true)}
            >
              {dict.edit}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void remove()}
            >
              {dict.delete}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
