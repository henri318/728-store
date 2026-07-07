import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';

export interface SessionUserContext {
  id?: string;
  userId?: string;
  role?: string;
}

export async function getSessionUserContext(): Promise<SessionUserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as SessionUserContext | undefined;
  return {
    userId: user?.userId ?? user?.id,
    role: user?.role,
  };
}
