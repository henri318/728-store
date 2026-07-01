'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { AuthCard } from '@/shared/ui/auth-card';
import styles from './page.module.css';

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
    <AuthCard className={styles.centered}>
      <h2 className={styles.title}>{dict.auth.verifyEmailTitle}</h2>

      {status === 'loading' && (
        <p className={styles.loadingText}>{dict.common.loading}</p>
      )}

      {status === 'success' && (
        <div role="alert" className={styles.successText}>
          <p className={styles.successMessage}>{dict.auth.emailVerified}</p>
          <p>{dict.auth.canLoginAfterVerification}</p>
        </div>
      )}

      {status === 'expired' && (
        <div role="alert" className={styles.expiredText}>
          <p>{dict.auth.tokenExpired}</p>
          <Link href="/" className={styles.link}>
            {dict.common.backToHome}
          </Link>
        </div>
      )}

      {status === 'invalid' && (
        <div role="alert" className={styles.invalidText}>
          <p>{dict.auth.invalidToken}</p>
          <Link href="/" className={styles.link}>
            {dict.common.backToHome}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
