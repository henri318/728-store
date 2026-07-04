'use client';

import { useId, type ChangeEvent } from 'react';
import styles from './price-field.module.css';

interface PriceFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function PriceField({
  label,
  value,
  onChange,
  error,
  required,
}: PriceFieldProps) {
  const id = useId();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputRow}>
        <input
          id={id}
          type="number"
          step="0.01"
          value={value}
          onChange={handleChange}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
        />
        <span className={styles.suffix}>&euro;</span>
      </div>
      {error && (
        <span id={errorId} role="alert" className={styles.errorText}>
          {error}
        </span>
      )}
    </div>
  );
}
