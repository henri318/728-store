import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/shared/infrastructure/prisma';
import { verifyPassword } from '@/shared/kernel/password-hasher';
import {
  checkRateLimit,
  recordLoginAttempt,
} from '@/shared/kernel/rate-limiter';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const ip =
          (req?.headers as Record<string, string | string[] | undefined>)?.['x-forwarded-for']?.toString().split(',')[0]?.trim()
          || (req?.headers as Record<string, string | string[] | undefined>)?.['x-real-ip']?.toString()
          || 'unknown';

        // Check rate limit before credential validation
        const rateCheck = await checkRateLimit(credentials.email, ip);
        if (rateCheck.blocked) {
          throw new Error(
            `RATE_LIMITED|${rateCheck.reason}|${rateCheck.retryAfterSeconds}`,
          );
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.passwordHash) {
          await recordLoginAttempt(credentials.email, ip, false);
          return null;
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash);

        if (!isValid) {
          await recordLoginAttempt(credentials.email, ip, false);
          return null;
        }

        // Record successful attempt before email verification gate
        await recordLoginAttempt(credentials.email, ip, true);

        // Email verification gate — only credential users need to be verified
        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
