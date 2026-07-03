'use client';

import { useState, type KeyboardEvent } from 'react';
import { Input } from '@/shared/ui/input';
import styles from './eye-toggle-wrapper.module.css';

interface EyeToggleWrapperProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function EyeToggleWrapper({
  label,
  value,
  onChange,
  error,
  required,
}: EyeToggleWrapperProps) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleVisibility();
    }
  };

  const inputType = showPassword ? 'text' : 'password';
  const ariaLabel = showPassword ? 'Hide password' : 'Show password';

  return (
    <Input
      label={label}
      value={value}
      onChange={onChange}
      type={inputType}
      error={error}
      required={required}
      rightElement={
        <button
          type="button"
          onClick={toggleVisibility}
          onKeyDown={handleKeyDown}
          aria-label={ariaLabel}
          className={styles.toggleButton}
        >
          <svg aria-hidden="true" width="20" height="20">
            <use
              href={`/img/icons/sprites.svg#icon-${showPassword ? 'eye' : 'eye-off'}`}
            />
          </svg>
        </button>
      }
    />
  );
}
