'use client';

import { useState } from 'react';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { ConfirmModal } from '@/shared/presentation/components/confirm-modal';
import styles from './product-actions.module.css';

interface ProductActionsProps {
  productId: string;
  currentStatus: string;
}

const ACTIVE_STATUS = 'ACTIVE';
const ARCHIVED_STATUS = 'ARCHIVED';
const DRAFT_STATUS = 'DRAFT';
const ELIMINATED_STATUS = 'ELIMINATED';

export function ProductActions({
  productId,
  currentStatus,
}: ProductActionsProps) {
  const dict = useDictionary();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === ELIMINATED_STATUS) {
      setPendingStatus(newStatus);
      setShowConfirmModal(true);
      return;
    }

    await executeStatusChange(newStatus);
  };

  const executeStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setStatus(data.status);
    } catch (error) {
      console.error('Failed to change product status:', error);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
      setPendingStatus(null);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      executeStatusChange(pendingStatus);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
  };

  const isActive = status === ACTIVE_STATUS;
  const isDraft = status === DRAFT_STATUS;
  const isArchived = status === ARCHIVED_STATUS;
  const isEliminated = status === ELIMINATED_STATUS;

  if (isEliminated) {
    return null;
  }

  return (
    <>
      <span className={styles.actions}>
        {isDraft && (
          <>
            <button
              type="button"
              className={`${styles.button} ${styles.activate}`}
              disabled={loading}
              onClick={() => handleStatusChange(ACTIVE_STATUS)}
            >
              {loading ? dict.common.loading : dict.admin.activateProduct}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.suspend}`}
              disabled={loading}
              onClick={() => handleStatusChange(ELIMINATED_STATUS)}
            >
              {loading ? dict.common.loading : dict.admin.eliminateProduct}
            </button>
          </>
        )}
        {isActive && (
          <>
            <button
              type="button"
              className={`${styles.button} ${styles.suspend}`}
              disabled={loading}
              onClick={() => handleStatusChange(ARCHIVED_STATUS)}
            >
              {loading ? dict.common.loading : dict.admin.suspendProduct}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.suspend}`}
              disabled={loading}
              onClick={() => handleStatusChange(ELIMINATED_STATUS)}
            >
              {loading ? dict.common.loading : dict.admin.eliminateProduct}
            </button>
          </>
        )}
        {isArchived && (
          <>
            <button
              type="button"
              className={`${styles.button} ${styles.activate}`}
              disabled={loading}
              onClick={() => handleStatusChange(ACTIVE_STATUS)}
            >
              {loading ? dict.common.loading : dict.admin.activateProduct}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.suspend}`}
              disabled={loading}
              onClick={() => handleStatusChange(ELIMINATED_STATUS)}
            >
              {loading ? dict.common.loading : dict.admin.eliminateProduct}
            </button>
          </>
        )}
      </span>
      <ConfirmModal
        open={showConfirmModal}
        title={dict.admin.eliminateProduct}
        message={dict.admin.eliminateProductConfirm}
        confirmLabel={dict.admin.eliminateProduct}
        cancelLabel={dict.common.cancel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        variant="danger"
      />
    </>
  );
}
