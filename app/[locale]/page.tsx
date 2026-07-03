import Image from 'next/image';
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
  const activeProducts = products.filter(
    (product) => product.status === 'ACTIVE',
  );

  return (
    <div>
      <HeroSection
        imageSrc="/img/hero/Elementos-14.svg"
        imageAlt={dict.common.heroImageAlt}
      />

      <MiddleSection ariaLabel={dict.common.products}>
        <div className={styles.productGrid}>
          {activeProducts.length === 0 ? (
            <p className={styles.emptyMessage}>{dict.common.noProducts}</p>
          ) : (
            activeProducts.map((product) => {
              const translation = product.translations[0] || {
                name: 'Untranslated',
                description: '',
              };
              const primaryImage = product.images[0] ?? null;
              const customizationHref = `/${locale}/products/${product.id}`;
              return (
                <div key={product.id} className={styles.productCard}>
                  <div className={styles.productImageWrap}>
                    {primaryImage ? (
                      <Image
                        src={primaryImage.url}
                        alt={primaryImage.alt ?? translation.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className={styles.productImage}
                      />
                    ) : (
                      <div
                        className={styles.productImageFallback}
                        aria-hidden="true"
                      >
                        {translation.name}
                      </div>
                    )}
                  </div>
                  <div className={styles.productCopy}>
                    <h3 className={styles.productName}>{translation.name}</h3>
                    <p className={styles.productDescription}>
                      {translation.description}
                    </p>
                    <p className={styles.productSeller}>{product.sellerName}</p>
                    <p className={styles.productPrice}>
                      {product.basePrice.format()}
                    </p>
                  </div>
                  <div className={styles.productActions}>
                    <Link
                      href={customizationHref}
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
                      imageUrl={primaryImage?.url ?? null}
                      customizationAvailable={
                        !product.customizationConfig?.isDefault()
                      }
                      customizeHref={customizationHref}
                      labels={{
                        addToCart: dict.common.addToCart,
                        removeFromCart: dict.common.removeFromCart,
                        adding: dict.common.addingToCart,
                        added: dict.common.addedToCart,
                        error: dict.common.cartError,
                        customizeProduct: dict.common.customizeProduct,
                        addWithoutCustomization:
                          dict.common.addWithoutCustomization,
                        customizationChoiceBadge: dict.common.customizable,
                        customizationChoiceMessage:
                          dict.common.customizationChoiceMessage,
                        decreaseQuantity: dict.common.decreaseQuantity,
                        increaseQuantity: dict.common.increaseQuantity,
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
