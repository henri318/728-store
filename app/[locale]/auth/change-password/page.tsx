'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/modules/presentation/components/button';
import { EyeToggleWrapper } from '@/modules/presentation/components/eye-toggle-wrapper';
import { PasswordStrengthIndicator } from '@/modules/presentation/components/password-strength-indicator';
import { useDictionary } from '@/shared/i18n/dictionary-context';

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
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        {dict.common.loading}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(dict.auth.passwordsDoNotMatch);
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
    <div
      style={{
        maxWidth: '480px',
        margin: '4rem auto',
        padding: '2rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{dict.auth.changePasswordTitle}</h2>
      {error && (
        <span
          role="alert"
          style={{
            color: '#ff4d4f',
            fontSize: '0.85rem',
            marginBottom: '0.5rem',
          }}
        >
          {error}
        </span>
      )}
      {success && (
        <div
          role="alert"
          style={{ color: '#52c41a', fontSize: '0.9rem', marginBottom: '1rem' }}
        >
          {success}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
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
    </div>
  );
}
