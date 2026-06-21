'use client';

import { useState } from 'react';
import { Button } from '@/modules/presentation/components/button';
import { useDictionary } from '@/shared/i18n/dictionary-context';

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
    <div
      role="alert"
      style={{
        backgroundColor: '#fffbe6',
        border: '1px solid #ffe58f',
        borderRadius: '4px',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <span style={{ color: '#ad6800', fontSize: '0.9rem' }}>
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
