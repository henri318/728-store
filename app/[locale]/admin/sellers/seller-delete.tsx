'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/modules/presentation/components/modal';
import { Button } from '@/modules/presentation/components/button';
import { ErrorMessage } from '@/modules/presentation/components/error-message';
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
        className={styles.deleteButton}
        onClick={() => setOpen(true)}
      >
        {dict.admin.delete}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className={styles.confirm}>
          <h3 className={styles.confirmTitle}>{dict.admin.deleteConfirm}</h3>
          <p className={styles.confirmMessage}>
            {dict.admin.deleteConfirmMessage}
          </p>
          <p className={styles.confirmSeller}>
            <strong>{sellerName}</strong>
          </p>
          {error && <ErrorMessage message={error} />}
          <div className={styles.confirmActions}>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {dict.common.cancel}
            </Button>
            <Button variant="danger" loading={loading} onClick={handleDelete}>
              {dict.admin.delete}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
