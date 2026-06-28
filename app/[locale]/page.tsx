import Link from 'next/link';
import { container } from '@/composition-root/container';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { HeroSection } from '@/shared/presentation/components/hero-section';
import { MiddleSection } from '@/shared/presentation/components/middle-section';
import { WaveTransition } from '@/shared/presentation/components/wave-transition';
import { BottomSection } from '@/shared/presentation/components/bottom-section';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import styles from './page.module.css';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  const products = await container.getProductRepository().findAll(locale);

  return (
    <div>
      <HeroSection
        imageSrc="/img/hero/Elementos-14.svg"
        imageAlt={dict.common.heroImageAlt}
      />

      <MiddleSection ariaLabel={dict.common.products}>
        <div className={styles.productGrid}>
          {products.length === 0 ? (
            <p className={styles.emptyMessage}>{dict.common.noProducts}</p>
          ) : (
            products.map((product) => {
              const translation = product.translations[0] || {
                name: 'Untranslated',
                description: '',
              };
              return (
                <div key={product.id} className={styles.productCard}>
                  <h3 className={styles.productName}>{translation.name}</h3>
                  <p className={styles.productDescription}>
                    {translation.description}
                  </p>
                  <p className={styles.productPrice}>
                    {product.basePrice.format()}
                  </p>
                  <p className={styles.productSeller}>{product.sellerName}</p>
                  <div className={styles.productActions}>
                    <Link
                      href={`/${locale}/products/${product.id}`}
                      className={styles.productLink}
                    >
                      {dict.common.viewDetails}
                    </Link>
                    <AddToCartButton
                      productId={product.id}
                      productName={translation.name}
                      sellerId={product.sellerId}
                      sellerName={product.sellerName}
                      price={product.basePrice.amount}
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
              );
            })
          )}
        </div>
      </MiddleSection>

      <WaveTransition animatedText={dict.common.slogan} />

      <BottomSection />
    </div>
  );
}
