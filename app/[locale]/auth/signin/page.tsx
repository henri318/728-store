'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { EyeToggleWrapper } from '@/modules/presentation/components/eye-toggle-wrapper';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './page.module.css';

export default function SignInPage() {
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dict = useDictionary();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn('credentials', { email, password, callbackUrl: `/${locale}` });
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <h2>{dict.auth.signInTitle}</h2>
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
        <Button type="submit" loading={loading}>
          {dict.auth.loginButton}
        </Button>
      </form>
      <p className={styles.footer}>
        {dict.auth.dontHaveAccount}{' '}
        <a href={`/${locale}/auth/signup`} className={styles.footerLink}>
          {dict.auth.signUpButton}
        </a>
      </p>
    </div>
  );
}
