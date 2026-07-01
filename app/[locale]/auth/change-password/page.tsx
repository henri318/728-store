'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { EyeToggleWrapper } from '@/shared/ui/eye-toggle-wrapper';
import { PasswordStrengthIndicator } from '@/shared/ui/password-strength-indicator';
import { AuthCard } from '@/shared/ui/auth-card';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { checkPasswordMatch } from '@/shared/validation/password-match';
import styles from './page.module.css';

export default function ChangePasswordPage() {
  const { status } = useSession();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dict = useDictionary();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${locale}/auth/signin`);
    }
  }, [status, locale, router]);

  if (status === 'loading') {
    return <div className={styles.loading}>{dict.common.loading}</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const mismatch = checkPasswordMatch(
      newPassword,
      confirmPassword,
      dict.auth.passwordsDoNotMatch,
    );
    if (mismatch) {
      setError(mismatch.confirmPassword);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || dict.auth.failedToChangePassword);
      }
      setSuccess(dict.auth.passwordChanged);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : dict.auth.failedToChangePassword,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <h2 className={styles.title}>{dict.auth.changePasswordTitle}</h2>
      {error && <ErrorMessage message={error} />}
      {success && (
        <div role="alert" className={styles.successMessage}>
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        <EyeToggleWrapper
          label={dict.auth.currentPassword}
          value={currentPassword}
          onChange={setCurrentPassword}
          required
        />
        <EyeToggleWrapper
          label={dict.auth.newPassword}
          value={newPassword}
          onChange={setNewPassword}
          required
        />
        <PasswordStrengthIndicator password={newPassword} />
        <EyeToggleWrapper
          label={dict.auth.confirmPassword}
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />
        <Button type="submit" loading={loading}>
          {dict.common.submit}
        </Button>
      </form>
    </AuthCard>
  );
}
