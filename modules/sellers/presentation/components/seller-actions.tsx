'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './seller-actions.module.css';

interface SellerActionsProps {
  sellerId: string;
  currentStatus: string;
}

export function SellerActions({ sellerId, currentStatus }: SellerActionsProps) {
  const dict = useDictionary();
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  if (status === 'banned') {
    return null;
  }

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sellers/${sellerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      const data = await res.json();
      setStatus(data.status);
      router.refresh();
    } catch {
      console.error('Failed to change seller status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className={styles.actions}>
      {status === 'active' && (
        <button
          type="button"
          className={`${styles.button} ${styles.suspend}`}
          disabled={loading}
          onClick={() => handleStatusChange('suspended')}
        >
          {loading ? '...' : dict.admin.suspend}
        </button>
      )}
      {status === 'suspended' && (
        <>
          <button
            type="button"
            className={`${styles.button} ${styles.activate}`}
            disabled={loading}
            onClick={() => handleStatusChange('active')}
          >
            {loading ? '...' : dict.admin.activate}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.ban}`}
            disabled={loading}
            onClick={() => handleStatusChange('banned')}
          >
            {loading ? '...' : dict.admin.ban}
          </button>
        </>
      )}
    </span>
  );
}
