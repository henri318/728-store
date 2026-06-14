import Link from 'next/link';
import { prisma } from '@/shared/infrastructure/prisma';
import { getDictionary } from '@/shared/i18n/get-dictionary';

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  const products = await prisma.product.findMany({
    include: { 
      seller: true,
      translations: {
        where: { locale: locale }
      }
    }
  });

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>{dict.common.products}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
        {products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          products.map((product) => {
            const translation = product.translations[0] || { name: 'Untranslated', description: '' };
            return (
              <div key={product.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
                <h3>{translation.name}</h3>
                <p>{translation.description}</p>
                <p style={{ fontWeight: 'bold' }}>${Number(product.basePrice)}</p>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>Seller: {product.seller.name}</p>
                <Link href={`/${locale}/products/${product.id}`}>
                  <button style={{ width: '100%', padding: '0.5rem', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
