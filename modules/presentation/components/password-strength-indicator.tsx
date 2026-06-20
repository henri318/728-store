'use client';

import { useDictionary } from '@/shared/i18n/dictionary-context';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const dict = useDictionary();

  const hasNumbers = /\d/.test(password);
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);

  const criteria = [
    { met: hasNumbers, label: dict.passwordStrength.hasNumbers },
    { met: hasLetters, label: dict.passwordStrength.hasLetters },
    { met: hasSpecialChars, label: dict.passwordStrength.hasSpecialChars },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const percentage = Math.round((metCount / 3) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
        {dict.passwordStrength.strengthLabel}
      </span>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '6px',
          backgroundColor: '#e0e0e0',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: percentage === 100 ? '#52c41a' : percentage >= 66 ? '#faad14' : percentage >= 33 ? '#faad14' : '#ff4d4f',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '0.8rem', color: '#666' }}>
        {metCount}/3
      </span>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {criteria.map((c) => (
          <li key={c.label} style={{ fontSize: '0.8rem', color: c.met ? '#52c41a' : '#999' }}>
            {c.met ? '✓' : '✗'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
