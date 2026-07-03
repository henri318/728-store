'use client';

import Link from 'next/link';
import { Modal } from '@/shared/ui/modal';
import { Button } from '@/shared/ui/button';
import styles from './add-to-cart-choice-modal.module.css';

interface AddToCartChoiceModalProps {
  open: boolean;
  badgeLabel: string;
  title: string;
  message: string;
  customizeLabel: string;
  addWithoutCustomizationLabel: string;
  customizeHref?: string;
  onAddWithoutCustomization: () => void;
  onClose: () => void;
}

export function AddToCartChoiceModal({
  open,
  badgeLabel,
  title,
  message,
  customizeLabel,
  addWithoutCustomizationLabel,
  customizeHref,
  onAddWithoutCustomization,
  onClose,
}: AddToCartChoiceModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className={styles.kicker}>{badgeLabel}</p>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {customizeHref ? (
            <Link
              href={customizeHref}
              className={styles.link}
              onClick={onClose}
            >
              {customizeLabel}
            </Link>
          ) : (
            <Button type="button" variant="primary" onClick={onClose}>
              {customizeLabel}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={onAddWithoutCustomization}
          >
            {addWithoutCustomizationLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
