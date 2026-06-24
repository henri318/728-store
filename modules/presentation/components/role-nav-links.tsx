'use client';

import Link from 'next/link';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './role-nav-links.module.css';

interface RoleNavLinksProps {
  role?: string | null;
  locale: string;
}

export function RoleNavLinks({ role, locale }: RoleNavLinksProps) {
  const dict = useDictionary();

  if (role === 'ADMIN') {
    return (
      <Link href={`/${locale}/admin/sellers`} className={styles.navLink}>
        {dict.userMenu.dashboard}
      </Link>
    );
  }

  if (role === 'DESIGNER') {
    return (
      <Link href={`/${locale}/profile`} className={styles.navLink}>
        {dict.userMenu.designerPanel}
      </Link>
    );
  }

  return null;
}
