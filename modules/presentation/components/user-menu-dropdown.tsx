'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Menu, X } from 'lucide-react';
import { Modal } from '@/modules/presentation/components/modal';
import { Button } from '@/modules/presentation/components/button';
import { useDictionary } from '@/shared/i18n/dictionary-context';

interface UserMenuDropdownProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserMenuDropdown({ user }: UserMenuDropdownProps) {
  const { locale } = useParams<{ locale: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ callbackUrl: `/${locale}` });
        return;
      }
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || dict.profile.deleteError || 'Failed to delete account');
    } catch {
      setDeleteError(dict.profile.deleteError || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#333',
        }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '200px',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <Link
            href={`/${locale}/profile`}
            role="menuitem"
            onClick={closeMenu}
            style={{
              display: 'block',
              padding: '0.75rem 1rem',
              textDecoration: 'none',
              color: '#333',
              borderBottom: '1px solid #eee',
            }}
          >
            {dict.userMenu.profile}
          </Link>
          <Link
            href={`/${locale}/auth/change-password`}
            role="menuitem"
            onClick={closeMenu}
            style={{
              display: 'block',
              padding: '0.75rem 1rem',
              textDecoration: 'none',
              color: '#333',
              borderBottom: '1px solid #eee',
            }}
          >
            {dict.userMenu.changePassword}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              setShowDeleteModal(true);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #eee',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#ff4d4f',
              fontSize: '1rem',
            }}
          >
            {dict.userMenu.deleteAccount}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#333',
              fontSize: '1rem',
            }}
          >
            {dict.userMenu.closeSession}
          </button>
        </div>
      )}

      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteError(null); }}>
        <h3 style={{ marginTop: 0 }}>{dict.profile.deleteConfirmTitle}</h3>
        <p style={{ marginBottom: '1.5rem' }}>
          {dict.profile.deleteConfirmMessage}
        </p>
        {deleteError && (
          <span role="alert" style={{ color: '#ff4d4f', fontSize: '0.85rem', display: 'block', marginBottom: '0.75rem' }}>
            {deleteError}
          </span>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={() => { setShowDeleteModal(false); setDeleteError(null); }}>
            {dict.common.cancel}
          </Button>
          <Button type="button" variant="danger" loading={deleting} onClick={handleDelete}>
            {dict.profile.deleteAccount}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
