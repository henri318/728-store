'use client';

import styles from './quantity-controls.module.css';

interface QuantityControlsProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  decrementLabel?: string;
  incrementLabel?: string;
  variant?: 'default' | 'compact';
}

export function QuantityControls({
  value,
  onChange,
  min = 1,
  max = 99,
  decrementLabel = '\u2212',
  incrementLabel = '+',
  variant = 'default',
}: QuantityControlsProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  // Mostrar siempre el símbolo como contenido visual,
  // el label se usa solo para accesibilidad.
  const decSymbol = '\u2212';
  const incSymbol = '+';

  return (
    <div
      className={`${styles.controls}${variant === 'compact' ? ` ${styles.compact}` : ''}`}
    >
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={decrementLabel}
      >
        {decSymbol}
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={incrementLabel}
      >
        {incSymbol}
      </button>
    </div>
  );
}
