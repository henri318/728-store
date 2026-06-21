'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useDictionary } from '@/shared/i18n/dictionary-context';

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
      style={{
        padding: '0.3rem',
        borderRadius: '4px',
        border: '1px solid #ccc',
      }}
    >
      <option value="es">{dict.common.languageEs}</option>
      <option value="cat">{dict.common.languageCat}</option>
    </select>
  );
}
