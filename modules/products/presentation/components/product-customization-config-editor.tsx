'use client';

import { TagList } from '@/shared/ui/tag-list';
import { DescriptionField } from '@/shared/ui/description-field';
import { SelectField } from '@/shared/ui/select-field';
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
  const update = (patch: Partial<ProductCustomizationConfigInput>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className={styles.grid}>
      <DescriptionField
        label={labels.designChangeDescriptionLabel}
        value={value.designChangeDescription ?? ''}
        onChange={(v) => update({ designChangeDescription: v || null })}
        placeholder={labels.designChangeDescriptionPlaceholder}
        rows={3}
      />

      <TagList
        label={labels.sizeOptionsLabel}
        placeholder={labels.sizeOptionsPlaceholder}
        addLabel="+ Añadir"
        value={value.sizeOptions ?? null}
        onChange={(next) => update({ sizeOptions: next })}
      />

      <SelectField
        label={labels.categoryLabel}
        value={value.categoryId ?? ''}
        onChange={(v) => update({ categoryId: v || null })}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        placeholder={labels.categoryPlaceholder}
      />

      <TagList
        label={labels.tagsLabel}
        placeholder={labels.tagsPlaceholder}
        addLabel="+ Añadir"
        emptyLabel={labels.tagsHelp}
        value={value.tagNames ?? null}
        onChange={(next) => update({ tagNames: next })}
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
