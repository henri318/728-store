'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <select 
      value={currentLocale} 
      onChange={(e) => handleLanguageChange(e.target.value)}
      style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }}
    >
      <option value="es">Español</option>
      <option value="cat">Català</option>
    </select>
  );
}
