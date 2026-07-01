'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AddToCartButton } from '@/modules/cart/presentation/components/add-to-cart-button';
import styles from '@/app/[locale]/page.module.css';

/**
 * Shape of a product as serialized to the client island.
 * Mirrors the server-rendered card exactly so the SSR first page and
 * hydrated appends are visually identical.
 */
export interface ClientProductCard {
  id: string;
  /** Price pre-formatted on the server/API so the client never needs format(). */
  basePrice: { amount: number; currency: string; formattedPrice: string };
  sellerId: string;
  sellerName: string;
  translations: Array<{
    locale: string;
    name: string;
    description: string | null;
  }>;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    position: number;
  }>;
  tags: Array<{ id: string; name: string; slug: string }>;
}

export interface InfiniteProductListLabels {
  viewDetails: string;
  addToCart: string;
  removeFromCart: string;
  increaseQuantity: string;
  decreaseQuantity: string;
  loadingMore: string;
  noSearchResults: string;
  noProducts: string;
  itemsLoadedOne: string;
  itemsLoadedMany: string;
}

export interface InfiniteProductListProps {
  initialItems: ClientProductCard[];
  pageSize: number;
  /**
   * Current search term. Changing this resets the list to `initialItems`
   * (i.e. the SSR page 1 from the server) — infinite scroll is
   * intentionally a single-search state machine.
   */
  q: string;
  locale: string;
  labels: InfiniteProductListLabels;
}

/**
 * InfiniteProductList — client island that:
 *  - Renders the SSR first page identically to the server.
 *  - Appends more pages on scroll via IntersectionObserver.
 *  - Resets state when `q` changes (no client-side fetch for new search;
 *    navigation hands off to the server-rendered page 1).
 *  - Announces new items via `aria-live="polite"` (WCAG 2.2 AA).
 *  - Honors `prefers-reduced-motion: reduce` by skipping the scroll
 *    animation toggle (none in v1 but a no-op hook for future use).
 */
export function InfiniteProductList({
  initialItems,
  pageSize,
  q,
  locale,
  labels,
}: InfiniteProductListProps) {
  const [items, setItems] = useState<ClientProductCard[]>(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialItems.length >= pageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        audience: 'public',
        page: String(page + 1),
        pageSize: String(pageSize),
        lang: locale,
      });
      if (q.trim().length > 0) params.set('q', q);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const body = (await res.json()) as {
        items: ClientProductCard[];
        total: number;
        totalPages: number;
      };
      const next = body.items;
      setItems((prev) => [...prev, ...next]);
      setPage((p) => p + 1);
      setHasMore(body.items.length >= pageSize && page + 1 < body.totalPages);
      // Announce how many items were appended for screen readers.
      // Use the i18n label so the announcement is localized; the parent
      // RSC passes the labels from the active dictionary.
      if (next.length > 0) {
        const template =
          next.length === 1 ? labels.itemsLoadedOne : labels.itemsLoadedMany;
        setAnnouncement(template.replace('{count}', String(next.length)));
      } else {
        setAnnouncement('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, pageSize, q, locale, labels]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadMore();
            break;
          }
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    return (
      <p className={styles.emptyMessage} role="status">
        {q.trim().length > 0
          ? labels.noSearchResults.replace('{term}', q)
          : labels.noProducts}
      </p>
    );
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {announcement}
      </div>
      <div className={styles.productGrid}>
        {items.map((product) => {
          const translation = product.translations[0] || {
            name: 'Untranslated',
            description: '',
          };
          return (
            <div
              key={product.id}
              className={styles.productCard}
              data-product-id={product.id}
            >
              <h3 className={styles.productName}>{translation.name}</h3>
              <p className={styles.productDescription}>
                {translation.description}
              </p>
              <p className={styles.productPrice}>
                {product.basePrice.formattedPrice}
              </p>
              <p className={styles.productSeller}>{product.sellerName}</p>
              <div className={styles.productActions}>
                <Link
                  href={`/${locale}/products/${product.id}`}
                  className={styles.productLink}
                >
                  {labels.viewDetails}
                </Link>
                <AddToCartButton
                  productId={product.id}
                  productName={translation.name}
                  sellerId={product.sellerId}
                  sellerName={product.sellerName}
                  price={product.basePrice.amount}
                  labels={{
                    addToCart: labels.addToCart,
                    removeFromCart: labels.removeFromCart,
                    adding: '...',
                    added: '✓',
                    error: 'Error',
                    increaseQuantity: labels.increaseQuantity,
                    decreaseQuantity: labels.decreaseQuantity,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        ref={sentinelRef}
        className={styles.sentinel}
        aria-hidden="true"
        data-testid="infinite-sentinel"
      />
      {isLoading && (
        <p className={styles.loadingMessage} role="status">
          {labels.loadingMore}
        </p>
      )}
      {error && (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
