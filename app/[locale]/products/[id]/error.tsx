'use client';

import styles from './error.module.css';
import { useDictionary } from '@/shared/i18n/dictionary-context';

export default function ProductDetailError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDictionary();

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-labelledby="product-error-title">
        <span className={styles.eyebrow}>
          {dict.common.unexpectedErrorStatus}
        </span>
        <h1 id="product-error-title">{dict.common.unexpectedErrorTitle}</h1>
        <p>{dict.common.unexpectedErrorDescription}</p>
        <button type="button" className={styles.retry} onClick={reset}>
          {dict.common.retry}
        </button>
      </section>
    </main>
  );
}
