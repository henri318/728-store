'use client';

import { Modal } from '@/shared/ui/modal';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import styles from './delete-confirm-modal.module.css';

interface DeleteConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function DeleteConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
  error,
  onConfirm,
  onCancel,
  children,
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={open} onClose={onCancel}>
      <div className={styles.confirm}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        {children}
        {error && <ErrorMessage message={error} />}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
