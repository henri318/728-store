import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface User extends DefaultUser {
    role?: string;
    emailVerified?: Date | string | null;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      emailVerified: Date | string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    emailVerified?: Date | string | null;
  }
}
