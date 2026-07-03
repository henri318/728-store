'use client';

import { useMemo } from 'react';
import type { ProductCustomizationConfigInput } from '../schemas/product-form-schema';
import styles from './product-customization-config-editor.module.css';

interface ProductCustomizationConfigEditorLabels {
  sizeOptionsLabel: string;
  sizeOptionsPlaceholder: string;
  allowPhotoDesignLabel: string;
  designChangeDescriptionLabel: string;
  designChangeDescriptionPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  tagsLabel: string;
  tagsPlaceholder: string;
  tagsHelp: string;
}

interface ProductCustomizationConfigEditorProps {
  value: ProductCustomizationConfigInput;
  onChange: (value: ProductCustomizationConfigInput) => void;
  labels: ProductCustomizationConfigEditorLabels;
  categories?: Array<{ id: string; name: string }>;
}

export function ProductCustomizationConfigEditor({
  value,
  onChange,
  labels,
  categories = [],
}: ProductCustomizationConfigEditorProps) {
  const tagInput = useMemo(
    () => (value.tagNames ?? []).join(', '),
    [value.tagNames],
  );

  const update = (patch: Partial<ProductCustomizationConfigInput>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>{labels.designChangeDescriptionLabel}</span>
          <textarea
            value={value.designChangeDescription ?? ''}
            onChange={(event) =>
              update({
                designChangeDescription: event.target.value.trim() || null,
              })
            }
            placeholder={labels.designChangeDescriptionPlaceholder}
            rows={3}
          />
        </label>

        <label className={styles.field}>
          <span>{labels.sizeOptionsLabel}</span>
          <input
            type="text"
            value={value.sizeOptions?.join(', ') ?? ''}
            onChange={(event) => {
              const options = event.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
              update({ sizeOptions: options.length > 0 ? options : null });
            }}
            placeholder={labels.sizeOptionsPlaceholder}
          />
        </label>

        <label className={styles.field}>
          <span>{labels.categoryLabel}</span>
          {categories.length > 0 ? (
            <select
              value={value.categoryId ?? ''}
              onChange={(event) =>
                update({ categoryId: event.target.value || null })
              }
            >
              <option value="">{labels.categoryPlaceholder}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value.categoryId ?? ''}
              onChange={(event) =>
                update({ categoryId: event.target.value || null })
              }
              placeholder={labels.categoryPlaceholder}
            />
          )}
        </label>

        <label className={styles.field}>
          <span>{labels.tagsLabel}</span>
          <input
            type="text"
            value={tagInput}
            onChange={(event) => {
              const tags = event.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
              update({ tagNames: tags.length > 0 ? tags : null });
            }}
            placeholder={labels.tagsPlaceholder}
            aria-describedby="tags-help"
          />
          <span id="tags-help" className={styles.help}>
            {labels.tagsHelp}
          </span>
        </label>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={Boolean(value.allowPhotoDesign)}
            onChange={(event) =>
              update({ allowPhotoDesign: event.target.checked })
            }
          />
          <span>{labels.allowPhotoDesignLabel}</span>
        </label>
      </div>
    </div>
  );
}
