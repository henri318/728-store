import { redirect } from 'next/navigation';
import { container } from '@/composition-root/container';
import { AdminListSellerProductsUseCase } from '@/modules/products/application/admin-list-seller-products-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { assertRole } from '@/shared/authorization/authorization';
import { LocalizedDate } from '@/shared/kernel/domain/value-objects/localized-date';

export default async function AdminSellerProductsPage({
  params,
}: {
  params: Promise<{ locale: string; sellerId: string }>;
}) {
  const { locale, sellerId } = await params;

  // Server-side role check — throws if not ADMIN
  try {
    await assertRole('ADMIN');
  } catch {
    redirect(`/${locale}`);
  }

  const dict = await getDictionary(locale as 'es' | 'cat');
  const productRepository = container.getProductRepository();
  const useCase = new AdminListSellerProductsUseCase(productRepository);
  const products = await useCase.execute({ sellerId, locale });

  return (
    <div>
      <a href={`/${locale}/admin/sellers`}>&larr; {dict.admin.backToSellers}</a>
      <h2>
        {dict.admin.sellerProductsTitle}: {sellerId}
      </h2>
      {products.length === 0 ? (
        <p>{dict.admin.noProducts}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.admin.productName}</th>
              <th>{dict.admin.productStatus}</th>
              <th>{dict.admin.productPrice}</th>
              <th>{dict.admin.productUpdated}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.translations[0]?.name ?? 'Untranslated'}</td>
                <td>{product.status}</td>
                <td>{product.basePrice.toFixed(2)}</td>
                <td>
                  {LocalizedDate.create(product.updatedAt, locale).toString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
