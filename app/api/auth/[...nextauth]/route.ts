import NextAuth from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

export { authOptions } from '@/shared/infrastructure/auth-options';
