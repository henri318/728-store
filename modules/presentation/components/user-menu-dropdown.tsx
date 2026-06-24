'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Menu, X } from 'lucide-react';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './user-menu-dropdown.module.css';

interface UserMenuDropdownProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
}

export function UserMenuDropdown(_props: UserMenuDropdownProps) {
  const { locale } = useParams<{ locale: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dict = useDictionary();

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className={styles.container}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={styles.triggerButton}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div role="menu" className={styles.dropdown}>
          {_props.user?.role === 'ADMIN' && (
            <Link
              href={`/${locale}/admin/sellers`}
              role="menuitem"
              onClick={closeMenu}
              className={styles.menuItem}
            >
              {dict.userMenu.dashboard}
            </Link>
          )}
          {_props.user?.role === 'DESIGNER' && (
            <Link
              href={`/${locale}/profile`}
              role="menuitem"
              onClick={closeMenu}
              className={styles.menuItem}
            >
              {dict.userMenu.designerPanel}
            </Link>
          )}
          <Link
            href={`/${locale}/profile`}
            role="menuitem"
            onClick={closeMenu}
            className={styles.menuItem}
          >
            {dict.userMenu.profile}
          </Link>
          <Link
            href={`/${locale}/auth/change-password`}
            role="menuitem"
            onClick={closeMenu}
            className={styles.menuItem}
          >
            {dict.userMenu.changePassword}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className={styles.menuButton}
          >
            {dict.userMenu.closeSession}
          </button>
        </div>
      )}
    </div>
  );
}
