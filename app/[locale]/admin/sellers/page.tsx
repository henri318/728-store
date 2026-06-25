import { redirect } from 'next/navigation';
import { container } from '@/composition-root/container';
import { ListSellersUseCase } from '@/modules/sellers/application/use-cases/list-sellers-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { assertRole } from '@/shared/authorization/authorization';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';
import { SellerActions } from './seller-actions';

export default async function AdminSellersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Server-side role check — throws if not ADMIN
  try {
    await assertRole('ADMIN');
  } catch {
    redirect(`/${locale}`);
  }

  const dict = await getDictionary(locale as 'es' | 'cat');
  const sellerRepository = container.getSellerRepository();
  const useCase = new ListSellersUseCase(sellerRepository);
  const sellers = await useCase.execute({});

  return (
    <div>
      <h2>{dict.admin.sellersTitle}</h2>
      {sellers.length === 0 ? (
        <p>{dict.admin.noSellers}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.admin.sellerName}</th>
              <th>{dict.admin.sellerStatus}</th>
              <th>{dict.admin.sellerCreated}</th>
              <th>{dict.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller) => (
              <tr key={seller.sellerId.value}>
                <td>{seller.name}</td>
                <td>
                  <span
                    data-testid={`status-badge-${seller.sellerId.value}`}
                    data-status={seller.status}
                  >
                    {dict.admin[
                      `status_${seller.status}` as keyof typeof dict.admin
                    ] ?? seller.status}
                  </span>
                </td>
                <td>
                  {LocalizedDate.create(seller.createdAt, locale).toString()}
                </td>
                <td>
                  <a
                    href={`/${locale}/admin/sellers/${seller.sellerId.value}/products`}
                  >
                    {dict.admin.viewProducts}
                  </a>
                  <SellerActions
                    sellerId={seller.sellerId.value}
                    currentStatus={seller.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
