'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './language-selector.module.css';

export default function LanguageSelector({
  currentLocale,
}: {
  currentLocale: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dict = useDictionary();

  const handleLanguageChange = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <select
      aria-label={dict.common.selectLanguage}
      value={currentLocale}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className={styles.select}
    >
      <option value="es">{dict.common.languageEs}</option>
      <option value="cat">{dict.common.languageCat}</option>
    </select>
  );
}
