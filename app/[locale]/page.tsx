import Link from 'next/link';
import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import styles from './page.module.css';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  // Use the ProductRepository port — no direct prisma in app/
  const products = await container.getProductRepository().findAll(locale);

  return (
    <div>
      <h2 className={styles.productsTitle}>{dict.common.products}</h2>
      <div className={styles.productGrid}>
        {products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          products.map((product) => {
            const translation = product.translations[0] || {
              name: 'Untranslated',
              description: '',
            };
            return (
              <div key={product.id} className={styles.productCard}>
                <h3>{translation.name}</h3>
                <p>{translation.description}</p>
                <p className={styles.productPrice}>
                  {'$'}
                  {Number(product.basePrice)}
                </p>
                <p className={styles.productSeller}>
                  Seller: {product.sellerName}
                </p>
                <Link href={`/${locale}/products/${product.id}`}>
                  <button className={styles.viewDetailsButton}>
                    {dict.common.viewDetails}
                  </button>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
