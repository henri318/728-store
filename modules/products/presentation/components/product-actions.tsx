'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { DeleteConfirmModal } from '@/shared/ui/delete-confirm-modal';
import styles from './product-actions.module.css';

interface ProductActionsProps {
  locale: string;
  productId: string;
  currentStatus: string;
}

const ACTIVE_STATUS = 'ACTIVE';
const ARCHIVED_STATUS = 'ARCHIVED';
const DRAFT_STATUS = 'DRAFT';
const ELIMINATED_STATUS = 'ELIMINATED';

export function ProductActions({
  locale,
  productId,
  currentStatus,
}: ProductActionsProps) {
  const dict = useDictionary();
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        let errorData: { error?: string } | null = null;
        try {
          errorData = await res.json();
        } catch {
          /* ignore parse errors */
        }
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setStatus(data.status);
      router.refresh();
      setShowConfirmModal(false);
      setPendingStatus(null);
    } catch {
      setError(dict.common.genericError);
    } finally {
      setLoading(false);
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
    setError(null);
  };

  const isActive = status === ACTIVE_STATUS;
  const isDraft = status === DRAFT_STATUS;
  const isArchived = status === ARCHIVED_STATUS;
  const isEliminated = status === ELIMINATED_STATUS;

  if (isEliminated) {
    return null;
  }

  const renderStatusButton = (
    label: string,
    className: string,
    status: string,
  ) => (
    <button
      type="button"
      className={className}
      disabled={loading}
      onClick={() => handleStatusChange(status)}
    >
      {loading ? dict.common.loading : label}
    </button>
  );

  const renderEliminateButton = () => (
    <button
      type="button"
      className={styles.iconButton}
      disabled={loading}
      aria-label={loading ? dict.common.loading : dict.admin.eliminateProduct}
      onClick={() => handleStatusChange(ELIMINATED_STATUS)}
    >
      <svg aria-hidden="true" className={styles.iconTrash}>
        <use href="/img/icons/sprites.svg#icon-trash" />
      </svg>
    </button>
  );

  return (
    <>
      <span className={styles.actions}>
        <Link
          href={`/${locale}/seller/products/${productId}/edit`}
          className={styles.editButton}
        >
          {dict.sellerDashboard.editProduct}
        </Link>
        {isDraft && (
          <>
            {renderStatusButton(
              dict.admin.activateProduct,
              `${styles.button} ${styles.activate}`,
              ACTIVE_STATUS,
            )}
            {renderEliminateButton()}
          </>
        )}
        {isActive && (
          <>
            {renderStatusButton(
              dict.admin.suspendProduct,
              `${styles.button} ${styles.suspend}`,
              ARCHIVED_STATUS,
            )}
            {renderEliminateButton()}
          </>
        )}
        {isArchived && (
          <>
            {renderStatusButton(
              dict.admin.activateProduct,
              `${styles.button} ${styles.activate}`,
              ACTIVE_STATUS,
            )}
            {renderEliminateButton()}
          </>
        )}
      </span>
      <DeleteConfirmModal
        open={showConfirmModal}
        title={dict.admin.eliminateProduct}
        message={dict.admin.eliminateProductConfirm}
        confirmLabel={dict.admin.eliminateProduct}
        cancelLabel={dict.common.cancel}
        loading={loading}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
