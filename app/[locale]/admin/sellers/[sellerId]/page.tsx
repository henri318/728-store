import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { container } from '@/composition-root/container';
import { assertRole } from '@/shared/authorization/authorization';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { NotFoundError } from '@/shared/kernel/app-error';
import { GetSellerUseCase } from '@/modules/sellers/application/use-cases/get-seller-use-case';
import styles from './page.module.css';
import { SellerDetailForm } from '@/modules/sellers/presentation/components/seller-detail-form';

export default async function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; sellerId: string }>;
}) {
  const { locale, sellerId } = await params;

  try {
    await assertRole('ADMIN');
  } catch {
    redirect(`/${locale}`);
  }

  const dict = await getDictionary(locale as 'es' | 'cat');
  const sellerRepository = container.getSellerRepository();
  const getSeller = new GetSellerUseCase(sellerRepository);

  let seller;
  try {
    seller = await getSeller.execute({ sellerId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <Link href={`/${locale}/admin/sellers`} className={styles.backLink}>
            {dict.admin.backToSellers}
          </Link>
          <h2 className={styles.title}>{dict.admin.sellerDetail.editTitle}</h2>
        </div>
      </header>

      <section
        className={styles.summary}
        aria-label={dict.admin.sellerDetail.editTitle}
      >
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            {dict.admin.sellerDetail.nameLabel}
          </span>
          <strong className={styles.summaryValue}>{seller.name}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>
            {dict.admin.sellerDetail.descriptionLabel}
          </span>
          <p className={styles.summaryValue}>{seller.description ?? '—'}</p>
        </div>
      </section>

      <SellerDetailForm
        sellerId={seller.sellerId.value}
        nameLabel={dict.admin.sellerDetail.nameLabel}
        descriptionLabel={dict.admin.sellerDetail.descriptionLabel}
        saveLabel={dict.admin.sellerDetail.save}
        savedLabel={dict.admin.sellerDetail.saved}
        errorLabel={dict.admin.sellerDetail.error}
        initialName={seller.name}
        initialDescription={seller.description ?? ''}
      />
    </div>
  );
}
