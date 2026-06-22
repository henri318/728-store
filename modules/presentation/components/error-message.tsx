'use client';

import styles from './error-message.module.css';

interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <span role="alert" className={styles.error}>
      {message}
    </span>
  );
}
