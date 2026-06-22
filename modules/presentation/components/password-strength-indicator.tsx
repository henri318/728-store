'use client';

import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './password-strength-indicator.module.css';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
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

  const strengthClass =
    percentage === 100
      ? styles.strong
      : percentage >= 33
        ? styles.medium
        : styles.weak;

  return (
    <div className={styles.container}>
      <span className={styles.label}>
        {dict.passwordStrength.strengthLabel}
      </span>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className={styles.progressTrack}
      >
        <div
          className={`${styles.progressFill} ${strengthClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={styles.counter}>{metCount}/3</span>
      <ul className={styles.criteriaList}>
        {criteria.map((c) => (
          <li
            key={c.label}
            className={`${styles.criteriaItem} ${c.met ? styles.criteriaMet : styles.criteriaNotMet}`}
          >
            {c.met ? '✓' : '✗'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
