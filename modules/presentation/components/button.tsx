'use client';

import type { MouseEvent } from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'submit' | 'button' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
}

const variantStyles: Record<
  NonNullable<ButtonProps['variant']>,
  React.CSSProperties
> = {
  primary: { background: '#0070f3', color: 'white' },
  secondary: { background: '#f0f0f0', color: '#333' },
  danger: { background: '#ff4d4f', color: 'white' },
};

export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'submit',
  variant = 'primary',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    onClick?.(e);
  };

  const variantStyle = variantStyles[variant];

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      data-variant={variant}
      style={{
        padding: '0.7rem 1.2rem',
        border: 'none',
        borderRadius: '4px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        fontWeight: 500,
        opacity: isDisabled ? 0.6 : 1,
        ...variantStyle,
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
