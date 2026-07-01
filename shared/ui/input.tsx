'use client';

import { useId, type ChangeEvent, type ReactNode } from 'react';
import styles from './input.module.css';

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Elemento renderizado dentro del input row (ej: toggle password) */
  rightElement?: ReactNode;
}

export function Input({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required,
  disabled,
  rightElement,
}: InputProps) {
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
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`${styles.input} ${error ? styles.inputError : ''} ${rightElement ? styles.hasSuffix : ''}`}
        />
        {rightElement && <span className={styles.suffix}>{rightElement}</span>}
      </div>
      {error && (
        <span id={errorId} role="alert" className={styles.errorText}>
          {error}
        </span>
      )}
    </div>
  );
}
