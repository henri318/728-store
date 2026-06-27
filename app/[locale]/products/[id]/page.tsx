import { container } from '@/composition-root/container';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import Link from 'next/link';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import styles from './page.module.css';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  const repository = container.getProductRepository();
  const useCase = new GetProductByIdUseCase(repository);

  let product = null;
  let error = false;

  try {
    product = await useCase.execute(id, locale);
  } catch {
    error = true;
  }

  if (error || !product) {
    return (
      <div>Error loading product details. Please check the server logs.</div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href={`/${locale}`} className={styles.backLink}>
        ← {dict.common.home}
      </Link>
      <div className={styles.grid}>
        <div className={styles.imagePlaceholder}>
          <span className={styles.imagePlaceholderText}>
            Product Image Placeholder
          </span>
        </div>
        <div>
          <h1>{product.displayName}</h1>
          <p className={styles.description}>{product.displayDescription}</p>
          <p className={styles.price}>
            {Number(product.basePrice).toFixed(2)} €
          </p>
          <p className={styles.seller}>Seller: {product.sellerName}</p>

          <div className={styles.addToCart}>
            <AddToCartButton
              productId={product.id}
              productName={product.displayName}
              sellerId={product.sellerId}
              sellerName={product.sellerName}
              price={product.basePrice}
              imageUrl={product.images?.[0]?.url ?? null}
              labels={{
                addToCart: dict.common.addToCart,
                removeFromCart: dict.common.removeFromCart,
                adding: '...',
                added: '✓',
                error: 'Error',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
