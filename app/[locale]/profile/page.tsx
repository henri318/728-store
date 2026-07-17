import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { container } from '@/composition-root/container';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { ProfileForm } from './profile-form';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return redirect(`/${locale}/auth/signin`);
  }

  const user = await container.getUserRepository().findById(userId);
  if (!user || user.deletedAt) {
    return redirect(`/${locale}/auth/signin`);
  }

  return (
    <ProfileForm
      locale={locale}
      role={session.user.role}
      profile={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email.value,
        address: user.address ?? {},
      }}
    />
  );
}
