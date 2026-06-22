'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { ErrorMessage } from '@/modules/presentation/components/error-message';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const dict = useDictionary();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(() =>
    !token ? dict.auth.tokenExpired : null,
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(dict.auth.passwordsDoNotMatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token!, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || dict.auth.invalidResetToken);
      }
      setSuccess(true);
      router.push('/');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : dict.auth.failedToResetPassword,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.containerCentered}>
        <h2 className={styles.title}>{dict.auth.resetPasswordTitle}</h2>
        <ErrorMessage message={error ?? undefined} />
        <Link href="/auth/forgot-password" className={styles.link}>
          {dict.auth.requestNewLink}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{dict.auth.resetPasswordTitle}</h2>
      {error && <ErrorMessage message={error} />}
      {success && (
        <div role="alert" className={styles.successMessage}>
          {dict.auth.passwordChanged}. {dict.common.redirecting}
        </div>
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label={dict.auth.newPassword}
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          required
        />
        <Input
          label={dict.auth.confirmPassword}
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />
        <Button type="submit" loading={loading}>
          {dict.common.submit}
        </Button>
      </form>
    </div>
  );
}
