'use client';

import { useState } from 'react';
import { Button } from '@/modules/presentation/components/button';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './verify-banner.module.css';

interface VerifyBannerProps {
  email: string;
}

export function VerifyBanner({ email }: VerifyBannerProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const dict = useDictionary();

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="alert" className={styles.banner}>
      <span className={styles.message}>
        {sent ? dict.auth.emailVerified : dict.common.unverifiedBanner}
      </span>
      {!sent && (
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={handleResend}
        >
          {dict.common.resendVerification}
        </Button>
      )}
    </div>
  );
}
