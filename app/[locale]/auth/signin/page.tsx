'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { EyeToggleWrapper } from '@/modules/presentation/components/eye-toggle-wrapper';
import { useDictionary } from '@/shared/i18n/dictionary-context';

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
    <div
      style={{
        maxWidth: '400px',
        margin: '4rem auto',
        padding: '2rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
      }}
    >
      <h2>{dict.auth.signInTitle}</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
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
      <p style={{ marginTop: '1rem' }}>
        {dict.auth.dontHaveAccount}{' '}
        <a href={`/${locale}/auth/signup`} style={{ color: '#0070f3' }}>
          {dict.auth.signUpButton}
        </a>
      </p>
    </div>
  );
}
