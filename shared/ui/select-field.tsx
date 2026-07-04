'use client';

import { useId, type ChangeEvent } from 'react';
import styles from './select-field.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: SelectFieldProps) {
  const id = useId();
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${styles.select} ${error ? styles.selectError : ''}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} role="alert" className={styles.errorText}>
          {error}
        </span>
      )}
    </div>
  );
}
