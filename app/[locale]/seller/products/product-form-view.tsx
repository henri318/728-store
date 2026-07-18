import { BackLink } from '@/shared/ui/back-link';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PriceField } from '@/shared/ui/price-field';
import { SelectField } from '@/shared/ui/select-field';
import { ProductLocaleTabs } from '@/modules/products/presentation/components/product-locale-tabs';
import { ProductTranslationSection } from '@/modules/products/presentation/components/product-translation-section';
import { ProductFormPhotoGalleries } from './product-form-photo-galleries';
import type { ProductFormProps } from './product-form-types';
import type { ProductFormController } from './use-product-form';
import styles from './product-form.module.css';

interface ProductFormViewProps {
  locale: string;
  labels: ProductFormProps['labels'];
  categories: NonNullable<ProductFormProps['categories']>;
  controller: ProductFormController;
}

export function ProductFormView({
  locale,
  labels,
  categories,
  controller,
}: ProductFormViewProps) {
  const { form, errors } = controller;

  return (
    <>
      {controller.unsavedGuard}
      <form className={styles.form} onSubmit={controller.handleSubmit}>
        <BackLink href={`/${locale}/seller/products`}>
          {labels.backToProducts}
        </BackLink>
        <div className={styles.content}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>{labels.customization.label}</p>
              <h1 className={styles.title}>{labels.title}</h1>
              <p className={styles.subtitle}>{labels.customization.hint}</p>
            </div>
          </header>
          {controller.serverError ? (
            <p className={styles.alert} role="alert">
              {controller.serverError}
            </p>
          ) : null}
          {controller.saved ? (
            <p className={styles.success} role="status">
              {controller.saved}
            </p>
          ) : null}
          <div className={styles.tabsSticky}>
            <ProductLocaleTabs
              value={form.activeLocale}
              onChange={controller.updateLocale}
              labels={labels.localeTabs}
            />
          </div>
          <Card padding="md">
            <div className={styles.formBody}>
              <ProductTranslationSection
                locale={form.activeLocale}
                value={form.translations[form.activeLocale]}
                onChange={controller.updateTranslation}
                labels={labels.translationSection}
                errors={{ name: errors.name, description: errors.description }}
              />
            </div>
            <hr className={styles.divider} />
            <div className={styles.formBody}>
              <PriceField
                label={labels.priceLabel}
                value={form.price}
                onChange={(value) => controller.updateField('price', value)}
                error={errors.price}
                required
              />
              <SelectField
                label={labels.customization.editor.categoryLabel}
                value={form.customizationConfig.categoryId ?? ''}
                onChange={(value) =>
                  controller.updateField('customizationConfig', {
                    ...form.customizationConfig,
                    categoryId: value || null,
                  })
                }
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                placeholder={labels.customization.editor.categoryPlaceholder}
              />
              {errors.images ? (
                <p className={styles.alert} role="alert">
                  {errors.images}
                </p>
              ) : null}
              <ProductFormPhotoGalleries
                controller={controller}
                labels={labels.gallery}
              />
            </div>
            <div className={styles.buttonRow}>
              <Button
                type="submit"
                loading={controller.loading || controller.uploading}
              >
                {labels.submit}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </>
  );
}
