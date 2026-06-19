'use client';

import { useSession } from 'next-auth/react';
import { VerifyBanner } from '@/modules/presentation/components/verify-banner';

export function VerificationBannerWrapper() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user?.email) {
    return null;
  }

  // Show banner when email is not verified
  const user = session.user as { emailVerified?: string | null };
  if (user.emailVerified !== null && user.emailVerified !== undefined) {
    return null;
  }

  return <VerifyBanner email={session.user.email} />;
}
