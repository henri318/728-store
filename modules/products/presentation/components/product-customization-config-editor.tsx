'use client';

import { SelectField } from '@/shared/ui/select-field';
import type { ProductCustomizationConfigInput } from '../schemas/product-form-schema';
import styles from './product-customization-config-editor.module.css';

interface ProductCustomizationConfigEditorLabels {
  allowPhotoDesignLabel: string;
  categoryLabel: string;
  categoryPlaceholder: string;
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
  const update = (patch: Partial<ProductCustomizationConfigInput>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className={styles.grid}>
      <SelectField
        label={labels.categoryLabel}
        value={value.categoryId ?? ''}
        onChange={(v) => update({ categoryId: v || null })}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        placeholder={labels.categoryPlaceholder}
      />

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
  );
}
