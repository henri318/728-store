'use client';

import { DescriptionField } from '@/shared/ui/description-field';
import { TagList } from '@/shared/ui/tag-list';
import { TextField } from '@/shared/ui/text-field';
import styles from './product-translation-section.module.css';

export interface ProductTranslationDraft {
  name: string;
  description: string;
  tags: string[];
  sizes: string[];
  designChangeDescription: string | null;
  customizationInstructions?: string | null;
}

interface ProductTranslationSectionLabels {
  title: string;
  hint: string;
  nameLabel: string;
  descriptionLabel: string;
  tagsLabel: string;
  tagsPlaceholder: string;
  tagsAddLabel: string;
  tagsEmptyLabel: string;
  sizesLabel: string;
  sizesPlaceholder: string;
  sizesAddLabel: string;
  sizesEmptyLabel: string;
  designChangeDescriptionLabel: string;
  designChangeDescriptionHelp: string;
  designChangeDescriptionPlaceholder: string;
}

interface ProductTranslationSectionProps {
  locale: 'es' | 'cat';
  value: ProductTranslationDraft;
  onChange: (value: ProductTranslationDraft) => void;
  labels: ProductTranslationSectionLabels;
  errors?: {
    name?: string;
    description?: string;
  };
}

export function ProductTranslationSection({
  locale,
  value,
  onChange,
  labels,
  errors,
}: ProductTranslationSectionProps) {
  const update = (patch: Partial<ProductTranslationDraft>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <section
      className={styles.section}
      aria-label={labels.title}
      data-locale={locale}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{locale.toUpperCase()}</p>
          <h2 className={styles.title}>{labels.title}</h2>
        </div>
        <p className={styles.hint}>{labels.hint}</p>
      </header>

      <div className={styles.grid}>
        <TextField
          label={labels.nameLabel}
          value={value.name}
          onChange={(next) => update({ name: next })}
          error={errors?.name}
          required
        />

        <DescriptionField
          label={labels.descriptionLabel}
          value={value.description}
          onChange={(next) => update({ description: next })}
          error={errors?.description}
        />

        <TagList
          label={labels.tagsLabel}
          value={value.tags.length > 0 ? value.tags : null}
          onChange={(next) => update({ tags: next ?? [] })}
          placeholder={labels.tagsPlaceholder}
          addLabel={labels.tagsAddLabel}
          emptyLabel={labels.tagsEmptyLabel}
        />

        <TagList
          label={labels.sizesLabel}
          value={value.sizes.length > 0 ? value.sizes : null}
          onChange={(next) => update({ sizes: next ?? [] })}
          placeholder={labels.sizesPlaceholder}
          addLabel={labels.sizesAddLabel}
          emptyLabel={labels.sizesEmptyLabel}
        />

        <DescriptionField
          label={labels.designChangeDescriptionLabel}
          value={value.designChangeDescription ?? ''}
          onChange={(next) =>
            update({
              designChangeDescription: next.trim().length > 0 ? next : null,
            })
          }
          helpText={labels.designChangeDescriptionHelp}
          placeholder={labels.designChangeDescriptionPlaceholder}
        />
      </div>
    </section>
  );
}
