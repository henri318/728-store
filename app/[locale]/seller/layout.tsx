import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { assertRole } from '@/shared/authorization/authorization';

export default async function SellerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  try {
    await assertRole('DESIGNER');
  } catch {
    redirect(`/${locale}`);
  }

  return <>{children}</>;
}
