'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteConfirmModal } from '@/shared/ui/delete-confirm-modal';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './seller-delete.module.css';

interface SellerDeleteProps {
  sellerId: string;
  sellerName: string;
}

export function SellerDelete({ sellerId, sellerName }: SellerDeleteProps) {
  const router = useRouter();
  const dict = useDictionary();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sellers/${sellerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete seller');
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(dict.admin.deleteSellerError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={dict.admin.delete}
        onClick={() => setOpen(true)}
      >
        <svg aria-hidden="true" className={styles.iconTrash}>
          <use href="/img/icons/sprites.svg#icon-trash" />
        </svg>
      </button>

      <DeleteConfirmModal
        open={open}
        title={dict.admin.deleteConfirm}
        message={dict.admin.deleteConfirmMessage}
        confirmLabel={dict.admin.delete}
        cancelLabel={dict.common.cancel}
        loading={loading}
        error={error}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      >
        <p className={styles.confirmSeller}>
          <strong>{sellerName}</strong>
        </p>
      </DeleteConfirmModal>
    </>
  );
}
