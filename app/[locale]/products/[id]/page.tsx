import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import Link from 'next/link';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
  
  const repository = container.getProductRepository();
  const useCase = new GetProductByIdUseCase(repository);
  
  try {
    const product = await useCase.execute(id, locale);

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href={`/${locale}`} style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
          ← {dict.common.home}
        </Link>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
          <div style={{ background: '#f9f9f9', height: '400px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#ccc' }}>Product Image Placeholder</span>
          </div>
          <div>
            <h1>{product.displayName}</h1>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>{product.displayDescription}</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '1.5rem 0' }}>${product.basePrice}</p>
            <p style={{ fontSize: '0.9rem', color: '#888' }}>Seller: {product.sellerName}</p>
            
            <form action="/api/orders" method="POST" style={{ marginTop: '1rem' }}>
              <input type="hidden" name="productId" value={product.id} />

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="customizationText" style={{ display: 'block', marginBottom: '0.5rem' }}>Custom Text:</label>
                <input type="text" id="customizationText" name="customizationText" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="customizationColor" style={{ display: 'block', marginBottom: '0.5rem' }}>Color:</label>
                <input type="color" id="customizationColor" name="customizationColor" defaultValue="#ffffff" style={{ width: '60px', height: '30px', border: 'none', borderRadius: '4px' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="customizationSize" style={{ display: 'block', marginBottom: '0.5rem' }}>Size:</label>
                <select id="customizationSize" name="customizationSize" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="customizationImage" style={{ display: 'block', marginBottom: '0.5rem' }}>Image:</label>
                <input type="file" id="customizationImage" name="customizationImage" accept="image/*" style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '0.5rem' }} />
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#888' }}>Image upload functionality not fully implemented.</small>
              </div>

              <button type="submit" style={{ 
                width: '100%', 
                padding: '1rem', 
                background: '#000', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '1.1rem',
                marginTop: '1rem'
              }}>
                Add to Cart / Buy Now
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    // Error boundary for product not found or other fetch errors
    return <div>Error loading product details. Please check the server logs.</div>;
  }
}
