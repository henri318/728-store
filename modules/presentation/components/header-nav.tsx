'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoginModal } from '@/modules/presentation/components/login-modal';
import { UserMenuDropdown } from '@/modules/presentation/components/user-menu-dropdown';
import { RoleNavLinks } from '@/modules/presentation/components/role-nav-links';
import styles from './header-nav.module.css';

interface HeaderNavProps {
  loginLabel: string;
  profileAlt: string;
  cartAlt: string;
}

export function HeaderNav({ loginLabel, profileAlt, cartAlt }: HeaderNavProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const isAuthPage = pathname.includes('/auth/');
  const locale = pathname.split('/')[1] ?? 'es';

  if (status === 'authenticated' && session?.user) {
    return (
      <>
        <UserMenuDropdown user={session.user}>
          <img
            src="/img/icons/iconos-07.svg"
            alt={profileAlt}
            className={styles.userIcon}
          />
        </UserMenuDropdown>
        <img
          src="/img/icons/iconos-04.svg"
          alt={cartAlt}
          className={styles.userIcon}
        />
        <RoleNavLinks role={session.user.role} locale={locale} />
      </>
    );
  }

  if (isAuthPage) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsLoginOpen(true)}
        className={styles.iconButton}
        aria-label={loginLabel}
      >
        <img
          src="/img/icons/iconos-07.svg"
          alt={profileAlt}
          className={styles.userIcon}
        />
      </button>
      <img
        src="/img/icons/iconos-04.svg"
        alt={cartAlt}
        className={styles.userIcon}
      />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
