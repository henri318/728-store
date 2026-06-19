'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { ErrorMessage } from '@/modules/presentation/components/error-message';
import { useDictionary } from '@/shared/i18n/dictionary-context';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const dict = useDictionary();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(dict.auth.tokenExpired);
    }
  }, [token, dict]);

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
      setError(err instanceof Error ? err.message : dict.auth.failedToResetPassword);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
        <h2 style={{ marginTop: 0 }}>{dict.auth.resetPasswordTitle}</h2>
        <ErrorMessage message={error ?? undefined} />
        <a href="/auth/forgot-password" style={{ color: '#0070f3' }}>{dict.auth.requestNewLink}</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>{dict.auth.resetPasswordTitle}</h2>
      {error && <ErrorMessage message={error} />}
      {success && (
        <div role="alert" style={{ color: '#52c41a', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {dict.auth.passwordChanged}. {dict.common.redirecting}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
