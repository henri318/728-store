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
