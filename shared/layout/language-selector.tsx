'use client';

import { useRouter, usePathname } from 'next/navigation';
import styles from './language-selector.module.css';

const TOGGLE: Record<string, { target: string; label: string }> = {
  es: { target: 'cat', label: 'Català' },
  cat: { target: 'es', label: 'Español' },
};

export default function LanguageSelector({
  currentLocale,
}: {
  currentLocale: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const toggle = TOGGLE[currentLocale] ?? TOGGLE.es;

  const handleToggle = () => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${toggle.target}`);
    router.push(newPath);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={styles.button}
      aria-label={toggle.label}
    >
      {toggle.label}
    </button>
  );
}
