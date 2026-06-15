import NextAuth from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';

export { authOptions };

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
