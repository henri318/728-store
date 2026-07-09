import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { requireAdmin } from '@/shared/authorization/require-admin';
import { ListCategoriesUseCase } from '@/modules/products/application/list-categories-use-case';
import { ConfigurationForm } from './configuration-form';
import styles from './page.module.css';

export default async function AdminConfigurationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  await requireAdmin(locale);

  const dict = await getDictionary(locale as 'es' | 'cat');
  const useCase = new ListCategoriesUseCase(container.getCategoryRepository());
  const categories = await useCase.execute();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.kicker}>ADMIN</span>
        <h1 className={styles.title}>{dict.admin.configuration.title}</h1>
        <p className={styles.description}>
          {dict.admin.configuration.description}
        </p>
      </header>

      <ConfigurationForm
        locale={locale}
        dict={dict as never}
        initialCategories={categories.map((category) => ({
          ...category,
          createdAt: category.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
