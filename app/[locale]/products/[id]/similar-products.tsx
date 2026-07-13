'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { resolveDisplay } from '@/modules/products/domain/entities/product-translation';
import styles from './similar-products.module.css';

interface SimilarProductCard {
  id: string;
  basePrice: { amount: number; currency: string; formattedPrice: string };
  sellerId: string;
  sellerName: string;
  translations: Array<{
    locale: string;
    name: string;
    description: string | null;
  }>;
  cover: { url: string; alt: string | null } | null;
}

interface SimilarProductsProps {
  productId: string;
  locale: string;
  labels: {
    title: string;
    viewDetails: string;
    noImageAvailable: string;
    loading: string;
  };
}

export function SimilarProducts({
  productId,
  locale,
  labels,
}: SimilarProductsProps) {
  const [items, setItems] = useState<SimilarProductCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || hasLoaded) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasLoaded && !isLoading) {
            setIsLoading(true);
            try {
              const res = await fetch(`/api/products/${productId}/similar`);
              if (!res.ok) {
                setHasLoaded(true);
                return;
              }
              const data: { items?: unknown } = await res.json();
              setItems(Array.isArray(data.items) ? data.items : []);
              setHasLoaded(true);
            } catch {
              setHasLoaded(true);
            } finally {
              setIsLoading(false);
            }
            break;
          }
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [productId, hasLoaded, isLoading]);

  if (hasLoaded && items.length === 0) return null;

  return (
    <section className={styles.section} aria-label={labels.title}>
      <div ref={sentinelRef} aria-hidden="true" />

      {isLoading && (
        <p className={styles.loading} role="status">
          {labels.loading}
        </p>
      )}

      {items.length > 0 && (
        <>
          <h2 className={styles.title}>{labels.title}</h2>
          <div className={styles.grid}>
            {items.map((product) => {
              const translation = resolveDisplay(
                product.translations,
                locale,
              ) ?? {
                name: '',
                description: '',
              };
              return (
                <Link
                  key={product.id}
                  href={`/${locale}/products/${product.id}`}
                  className={styles.card}
                >
                  <div className={styles.imageFrame}>
                    {product.cover ? (
                      <Image
                        src={product.cover.url}
                        alt={product.cover.alt ?? translation.name}
                        width={320}
                        height={320}
                        unoptimized
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <span>{labels.noImageAvailable}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.productName}>{translation.name}</h3>
                    <p className={styles.productPrice}>
                      {product.basePrice.formattedPrice}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
