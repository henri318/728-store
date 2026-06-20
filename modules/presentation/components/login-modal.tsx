'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Modal } from '@/modules/presentation/components/modal';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { EyeToggleWrapper } from '@/modules/presentation/components/eye-toggle-wrapper';
import { useDictionary } from '@/shared/i18n/dictionary-context';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dict = useDictionary();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/',
        redirect: false,
      });

      if (result?.error) {
        setError(dict.auth.invalidCredentials);
      } else if (result?.ok) {
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('CredentialsSignin')) {
        setError(dict.auth.invalidCredentials);
      } else {
        setError(message || dict.auth.invalidCredentials);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{dict.auth.signInTitle}</h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            {dict.common.close}
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label={dict.auth.email}
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <EyeToggleWrapper
            label={dict.auth.password}
            value={password}
            onChange={setPassword}
            required
          />
          {error && (
            <span role="alert" style={{ color: '#ff4d4f', fontSize: '0.85rem' }}>
              {error}
            </span>
          )}
          <Button type="submit" loading={loading}>
            {dict.auth.loginButton}
          </Button>
        </form>
      </div>
    </Modal>
  );
}
