'use client';

import {
  useId,
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
} from 'react';
import baseStyles from './input.module.css';

interface InputClassNames {
  wrapper?: string;
  label?: string;
  inputRow?: string;
  input?: string;
  suffix?: string;
  errorText?: string;
  inputError?: string;
  hasSuffix?: string;
}

export interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Step para inputs type="number" */
  step?: string;
  /** Elemento renderizado dentro del input row (ej: toggle password) */
  rightElement?: ReactNode;
  classNames?: InputClassNames;
}

export function Input({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  placeholder,
  required,
  disabled,
  step,
  rightElement,
  classNames,
}: InputProps) {
  const id = useId();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const errorId = error ? `${id}-error` : undefined;
  const s = classNames ?? baseStyles;

  return (
    <div className={s.wrapper}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <div className={s.inputRow}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          step={step}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`${s.input} ${error ? s.inputError : ''} ${rightElement ? s.hasSuffix : ''}`}
        />
        {rightElement && <span className={s.suffix}>{rightElement}</span>}
      </div>
      {error && (
        <span id={errorId} role="alert" className={s.errorText}>
          {error}
        </span>
      )}
    </div>
  );
}
