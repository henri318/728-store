'use client';

import { useId, type ChangeEvent } from 'react';
import styles from './description-field.module.css';

interface DescriptionFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  rows?: number;
}

export function DescriptionField({
  label,
  value,
  onChange,
  error,
  placeholder,
  rows = 4,
}: DescriptionFieldProps) {
  const id = useId();
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        id={id}
        className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.errorText}>
          {error}
        </span>
      )}
    </div>
  );
}
