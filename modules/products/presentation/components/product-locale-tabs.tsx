'use client';

import styles from './product-locale-tabs.module.css';

export type ProductLocale = 'es' | 'cat';

interface ProductLocaleTabsLabels {
  es: string;
  cat: string;
}

interface ProductLocaleTabsProps {
  value: ProductLocale;
  onChange: (locale: ProductLocale) => void;
  labels: ProductLocaleTabsLabels;
}

export function ProductLocaleTabs({
  value,
  onChange,
  labels,
}: ProductLocaleTabsProps) {
  const tabs: Array<{ locale: ProductLocale; label: string }> = [
    { locale: 'es', label: labels.es },
    { locale: 'cat', label: labels.cat },
  ];

  return (
    <div className={styles.tabs} role="tablist" aria-label="Product locales">
      {tabs.map((tab) => (
        <button
          key={tab.locale}
          type="button"
          role="tab"
          aria-selected={value === tab.locale}
          className={value === tab.locale ? styles.activeTab : styles.tab}
          onClick={() => onChange(tab.locale)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
