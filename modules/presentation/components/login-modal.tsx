'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Modal } from '@/modules/presentation/components/modal';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { EyeToggleWrapper } from '@/modules/presentation/components/eye-toggle-wrapper';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './login-modal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { update } = useSession();
  const dict = useDictionary();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(dict.auth.invalidCredentials);
      } else if (result?.ok) {
        await update(); // Refresh session without page reload
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
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>{dict.auth.signInTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.common.close}
            className={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
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
            <span role="alert" className={styles.errorText}>
              {error}
            </span>
          )}
          <Button type="submit" loading={loading}>
            {dict.auth.loginButton}
          </Button>
        </form>

        <div className={styles.separator}>
          <span>{dict.auth.orContinueWith}</span>
        </div>

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className={styles.googleButton}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {dict.auth.googleLogin}
        </button>

        <div className={styles.footer}>
          <Link
            href="/auth/signup"
            onClick={onClose}
            className={styles.footerLink}
          >
            {dict.auth.dontHaveAccount}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
