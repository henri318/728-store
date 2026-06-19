'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { useDictionary } from '@/shared/i18n/dictionary-context';


export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dict = useDictionary();

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
      setError(err instanceof Error ? err.message : dict.auth.failedToChangePassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>{dict.auth.changePasswordTitle}</h2>
      {error && (
        <span role="alert" style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          {error}
        </span>
      )}
      {success && (
        <div role="alert" style={{ color: '#52c41a', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label={dict.auth.currentPassword}
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          required
        />
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
