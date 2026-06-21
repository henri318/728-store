'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDictionary } from '@/shared/i18n/dictionary-context';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<
    'loading' | 'success' | 'expired' | 'invalid'
  >(() => (!token ? 'invalid' : 'loading'));
  const dict = useDictionary();

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
        } else if (data.error?.includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('invalid');
        }
      })
      .catch(() => {
        setStatus('invalid');
      });

    return () => controller.abort();
  }, [token]);

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '4rem auto',
        padding: '2rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{dict.auth.verifyEmailTitle}</h2>

      {status === 'loading' && (
        <p style={{ color: '#666' }}>{dict.common.loading}</p>
      )}

      {status === 'success' && (
        <div role="alert" style={{ color: '#52c41a' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>
            {dict.auth.emailVerified}
          </p>
          <p>{dict.auth.canLoginAfterVerification}</p>
        </div>
      )}

      {status === 'expired' && (
        <div role="alert" style={{ color: '#faad14' }}>
          <p>{dict.auth.tokenExpired}</p>
          <Link href="/" style={{ color: '#0070f3' }}>
            {dict.common.backToHome}
          </Link>
        </div>
      )}

      {status === 'invalid' && (
        <div role="alert" style={{ color: '#ff4d4f' }}>
          <p>{dict.auth.invalidToken}</p>
          <Link href="/" style={{ color: '#0070f3' }}>
            {dict.common.backToHome}
          </Link>
        </div>
      )}
    </div>
  );
}
