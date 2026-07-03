import { redirect } from 'next/navigation';
import { assertRole } from './authorization';

export async function requireAdmin(locale: string): Promise<void> {
  try {
    await assertRole('ADMIN');
  } catch {
    redirect(`/${locale}`);
  }
}
