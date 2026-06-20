'use client';

import { useState, type KeyboardEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/modules/presentation/components/input';

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
    <div style={{ position: 'relative' }}>
      <Input
        label={label}
        value={value}
        onChange={onChange}
        type={inputType}
        error={error}
        required={required}
      />
      <button
        type="button"
        onClick={toggleVisibility}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        style={{
          position: 'absolute',
          right: '8px',
          top: '38px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          borderRadius: '4px',
        }}
      >
        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}
