'use client';

import { useId, type ChangeEvent } from 'react';

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
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
}: InputProps) {
  const id = useId();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const errorId = error ? `${id}-error` : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label htmlFor={id} style={{ fontSize: '0.9rem', fontWeight: 500 }}>
        {label}
      </label>
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
        style={{
          padding: '0.5rem',
          border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
          borderRadius: '4px',
          fontSize: '1rem',
          outline: 'none',
        }}
      />
      {error && (
        <span
          id={errorId}
          role="alert"
          style={{ color: '#ff4d4f', fontSize: '0.8rem' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
