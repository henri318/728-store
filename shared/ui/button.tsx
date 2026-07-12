'use client';

import type { MouseEvent } from 'react';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'submit' | 'button' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'submit',
  variant = 'primary',
}: ButtonProps) {
  const dict = useDictionary();
  const isDisabled = disabled || loading;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    onClick?.(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      data-variant={variant}
      className={`${styles.button} ${styles[variant]}`}
    >
      {loading ? dict.common.loading : children}
    </button>
  );
}
