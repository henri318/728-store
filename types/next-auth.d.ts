import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

type EmailVerified = Date | string | null;

declare module 'next-auth' {
  interface User extends DefaultUser {
    role?: string;
    emailVerified?: EmailVerified;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      emailVerified: EmailVerified;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    emailVerified?: EmailVerified;
  }
}
