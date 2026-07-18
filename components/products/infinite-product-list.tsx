'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AddToCartButton } from '@/modules/cart/presentation/components/add-to-cart-button';
import { resolveDisplay } from '@/modules/products/domain/entities/product-translation';
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
  cover: { url: string; alt: string | null } | null;
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
  noImageAvailable: string;
  itemsLoadedOne: string;
  itemsLoadedMany: string;
  showMore: string;
  showLess: string;
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
  category?: string;
  locale: string;
  labels: InfiniteProductListLabels;
}

function ProductDescription({
  description,
  labels,
}: {
  description: string | null;
  labels: Pick<InfiniteProductListLabels, 'showMore' | 'showLess'>;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = description ?? '';
  const canToggle = text.length > 160;

  return (
    <>
      <p
        className={`${styles.productDescription} ${canToggle && !expanded ? styles.descriptionClamp : ''}`}
      >
        {text}
      </p>
      {canToggle && (
        <button
          type="button"
          aria-expanded={expanded}
          className={styles.descriptionToggle}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? labels.showLess : labels.showMore}
        </button>
      )}
    </>
  );
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
  category,
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
  const inFlightRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const retryAfterRef = useRef(0);

  // Stable refs prevent observer churn and concurrent requests.
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const loadMore = useCallback(async () => {
    if (inFlightRef.current || !hasMore || Date.now() < retryAfterRef.current)
      return;

    const controller = new AbortController();
    inFlightRef.current = true;
    requestControllerRef.current = controller;
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
      if (category && category.trim().length > 0)
        params.set('category', category);

      const res = await fetch(`/api/products?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const body = (await res.json()) as {
        items: ClientProductCard[];
        total: number;
        totalPages: number;
      };
      if (controller.signal.aborted) return;
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
        setAnnouncement(template.split('{count}').join(String(next.length)));
      } else {
        setAnnouncement('');
      }
    } catch (error_: unknown) {
      if (controller.signal.aborted) return;
      retryAfterRef.current = Date.now() + 1000;
      setError(error_ instanceof Error ? error_.message : 'Unknown error');
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        inFlightRef.current = false;
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
  }, [hasMore, page, pageSize, q, category, locale, labels]);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [q, category, locale, pageSize],
  );

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
          ? labels.noSearchResults.replace('{term}', () => q)
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
          const translation = resolveDisplay(product.translations, locale) ?? {
            name: '',
            description: '',
          };
          return (
            <div
              key={product.id}
              className={styles.productCard}
              data-product-id={product.id}
            >
              <div className={styles.productCoverFrame}>
                {product.cover ? (
                  <Image
                    src={product.cover.url}
                    alt={product.cover.alt ?? translation.name}
                    width={640}
                    height={640}
                    unoptimized
                    className={styles.productCoverImage}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className={styles.productCoverPlaceholder}>
                    <span>{labels.noImageAvailable}</span>
                  </div>
                )}
              </div>
              <h3 className={styles.productName}>{translation.name}</h3>
              <ProductDescription
                description={translation.description}
                labels={labels}
              />
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
