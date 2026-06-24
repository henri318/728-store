'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoginButton } from '@/modules/presentation/components/login-button';
import { UserMenuDropdown } from '@/modules/presentation/components/user-menu-dropdown';
import { RoleNavLinks } from '@/modules/presentation/components/role-nav-links';

interface HeaderNavProps {
  loginLabel: string;
}

export function HeaderNav({ loginLabel }: HeaderNavProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthPage = pathname.includes('/auth/');
  const locale = pathname.split('/')[1] ?? 'es';

  if (status === 'authenticated' && session?.user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <RoleNavLinks role={session.user.role} locale={locale} />
        <UserMenuDropdown user={session.user} />
      </div>
    );
  }

  // Hide login button on auth pages (signup, signin, etc.)
  if (isAuthPage) {
    return null;
  }

  return <LoginButton label={loginLabel} />;
}
