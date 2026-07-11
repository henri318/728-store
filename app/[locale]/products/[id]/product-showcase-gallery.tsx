'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { isVideoMimeType } from '@/modules/products/domain/value-objects/product-image-purpose';
import styles from './page.module.css';

export interface ProductShowcaseMedia {
  id: string;
  url: string;
  alt: string;
  mimeType: string;
  posterUrl: string | null;
}

interface ProductShowcaseGalleryLabels {
  previous: string;
  next: string;
}

function ProductShowcaseItem({ media }: { media: ProductShowcaseMedia }) {
  const [hasDecodeError, setHasDecodeError] = useState(false);

  if (isVideoMimeType(media.mimeType)) {
    return (
      <div className={styles.showcaseItem}>
        {hasDecodeError ? (
          <div
            className={styles.showcasePlaceholder}
            role="img"
            aria-label={media.alt}
          >
            <span className={styles.showcasePlaceholderText}>{media.alt}</span>
          </div>
        ) : (
          <video
            controls
            preload="metadata"
            poster={media.posterUrl ?? undefined}
            className={styles.showcaseVideo}
            aria-label={media.alt}
            onError={() => setHasDecodeError(true)}
          >
            <source src={media.url} type={media.mimeType} />
          </video>
        )}
      </div>
    );
  }

  return (
    <div className={styles.showcaseItem}>
      <Image
        src={media.url}
        alt={media.alt}
        width={960}
        height={720}
        unoptimized
        className={styles.showcaseImage}
      />
    </div>
  );
}

type SwipePoint = { x: number; y: number };

function createViewportHandlers({
  isPointerEventsSupported,
  onPrevious,
  onNext,
}: {
  isPointerEventsSupported: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  let swipeStart: SwipePoint | null = null;

  const handleSwipeEnd = (endX: number, endY: number) => {
    if (!swipeStart) {
      return;
    }

    const deltaX = endX - swipeStart.x;
    const deltaY = endY - swipeStart.y;

    if (Math.abs(deltaX) <= 40 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      onNext();
    } else {
      onPrevious();
    }
  };

  if (isPointerEventsSupported) {
    return {
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse') {
          return;
        }

        swipeStart = {
          x: event.clientX,
          y: event.clientY,
        };

        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture failures and keep swipe fallback working.
        }
      },
      onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse') {
          return;
        }

        handleSwipeEnd(event.clientX, event.clientY);
        swipeStart = null;

        if (
          typeof event.currentTarget.hasPointerCapture === 'function' &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },
      onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => {
        swipeStart = null;

        if (
          typeof event.currentTarget.hasPointerCapture === 'function' &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },
    };
  }

  return {
    onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      swipeStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd: (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.changedTouches[0];

      if (!touch) {
        swipeStart = null;
        return;
      }

      handleSwipeEnd(touch.clientX, touch.clientY);
      swipeStart = null;
    },
  };
}

export function ProductShowcaseGallery({
  items,
  labels,
}: {
  items: ProductShowcaseMedia[];
  labels: ProductShowcaseGalleryLabels;
}) {
  const publicItems = useMemo(() => items.filter(Boolean), [items]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (publicItems.length === 0) {
    return null;
  }

  const isPointerEventsSupported = globalThis.PointerEvent !== undefined;
  const visibleIndex = Math.min(activeIndex, publicItems.length - 1);
  const activeMedia = publicItems[visibleIndex];

  const goToPrevious = () => {
    setActiveIndex(
      (current) => (current - 1 + publicItems.length) % publicItems.length,
    );
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % publicItems.length);
  };
  const viewportHandlers = createViewportHandlers({
    isPointerEventsSupported,
    onPrevious: goToPrevious,
    onNext: goToNext,
  });
  const hasMultipleItems = publicItems.length > 1;

  return (
    <section className={styles.showcaseSection} data-testid="showcase-gallery">
      <div
        className={styles.showcaseViewport}
        data-testid="showcase-viewport"
        {...viewportHandlers}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goToPrevious();
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            goToNext();
          }
        }}
        aria-live="polite"
      >
        <div className={styles.showcaseStatus}>
          {visibleIndex + 1} / {publicItems.length}
        </div>
        <ProductShowcaseItem key={activeMedia.id} media={activeMedia} />
      </div>
      {hasMultipleItems && (
        <div className={styles.showcaseControls}>
          <button
            type="button"
            className={styles.showcaseButton}
            onClick={goToPrevious}
          >
            {labels.previous}
          </button>
          <button
            type="button"
            className={styles.showcaseButton}
            onClick={goToNext}
          >
            {labels.next}
          </button>
        </div>
      )}
      {hasMultipleItems && (
        <div className={styles.showcaseDots} aria-hidden="true">
          {publicItems.map((item, index) => (
            <span
              key={item.id}
              className={`${styles.showcaseDot} ${index === visibleIndex ? styles.showcaseDotActive : ''}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
