'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoginButton } from '@/modules/presentation/components/login-button';
import { UserMenuDropdown } from '@/modules/presentation/components/user-menu-dropdown';

interface HeaderNavProps {
  loginLabel: string;
}

export function HeaderNav({ loginLabel }: HeaderNavProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthPage = pathname.includes('/auth/');

  if (status === 'authenticated' && session?.user) {
    return <UserMenuDropdown user={session.user} />;
  }

  // Hide login button on auth pages (signup, signin, etc.)
  if (isAuthPage) {
    return null;
  }

  return <LoginButton label={loginLabel} />;
}
