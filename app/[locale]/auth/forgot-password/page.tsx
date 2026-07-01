'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { AuthCard } from '@/shared/ui/auth-card';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const dict = useDictionary();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthCard>
      <h2 className={styles.title}>{dict.auth.forgotPasswordTitle}</h2>

      {submitted ? (
        <div role="alert" className={styles.successText}>
          <p>{dict.auth.checkEmailMessage}</p>
          <Link href="/" className={styles.link}>
            {dict.common.backToHome}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label={dict.auth.email}
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Button type="submit" loading={loading}>
            {dict.auth.sendResetLink}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
