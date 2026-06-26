import { redirect } from 'next/navigation';
import { container } from '@/composition-root/container';
import { ListSellersUseCase } from '@/modules/sellers/application/use-cases/list-sellers-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { assertRole } from '@/shared/authorization/authorization';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { SellerActions } from './seller-actions';
import { SellerDelete } from './seller-delete';
import styles from './page.module.css';

const PAGE_SIZE = 15;

export default async function AdminSellersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageStr } = await searchParams;
  const currentPage = Math.max(1, Number(pageStr) || 1);

  try {
    await assertRole('ADMIN');
  } catch {
    redirect(`/${locale}`);
  }

  const dict = await getDictionary(locale as 'es' | 'cat');
  const sellerRepository = container.getSellerRepository();
  const useCase = new ListSellersUseCase(sellerRepository);
  const allSellers = await useCase.execute({});
  const total = allSellers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const sellers = allSellers.slice(start, start + PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{dict.admin.sellersTitle}</h2>
        <a
          href={`/${locale}/admin/sellers/create`}
          className={styles.createButton}
        >
          + {dict.admin.createSeller}
        </a>
      </div>
      {sellers.length === 0 ? (
        <p className={styles.noSellers}>{dict.admin.noSellers}</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{dict.admin.sellerName}</th>
                <th>{dict.admin.sellerDescriptionList}</th>
                <th>{dict.admin.sellerStatus}</th>
                <th>{dict.admin.sellerCreated}</th>
                <th>{dict.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller.sellerId.value}>
                  <td className={styles.nameCell}>{seller.name}</td>
                  <td className={styles.descriptionCell}>
                    {seller.description ?? '—'}
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      data-testid={`status-badge-${seller.sellerId.value}`}
                      data-status={seller.status}
                    >
                      {dict.admin[
                        `status_${seller.status}` as keyof typeof dict.admin
                      ] ?? seller.status}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {LocalizedDate.create(seller.createdAt, locale).toString()}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <a
                        href={`/${locale}/admin/sellers/${seller.sellerId.value}/products`}
                        className={styles.viewProducts}
                      >
                        {dict.admin.viewProducts}
                      </a>
                      <SellerActions
                        sellerId={seller.sellerId.value}
                        currentStatus={seller.status}
                      />
                      <SellerDelete
                        sellerId={seller.sellerId.value}
                        sellerName={seller.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.pagination}>
            {safePage <= 1 ? (
              <span
                className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
              >
                {dict.admin.pagePrev}
              </span>
            ) : (
              <a
                href={`/${locale}/admin/sellers?page=${safePage - 1}`}
                className={styles.pageButton}
              >
                {dict.admin.pagePrev}
              </a>
            )}
            <span className={styles.pageInfo}>
              {dict.admin.pageXofY
                .replace('{current}', String(safePage))
                .replace('{total}', String(totalPages))}
            </span>
            {safePage >= totalPages ? (
              <span
                className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
              >
                {dict.admin.pageNext}
              </span>
            ) : (
              <a
                href={`/${locale}/admin/sellers?page=${safePage + 1}`}
                className={styles.pageButton}
              >
                {dict.admin.pageNext}
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
