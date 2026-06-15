import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { container } from '@/composition-root/container';

/**
 * NextAuth configuration.
 *
 * Single source of truth — re-exported from `app/api/auth/[...nextauth]/route.ts`
 * for back-compat with any external importer.
 */
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

        // RateLimiter comes from the container — no direct infra import in app/
        const rateLimiter = container.getRateLimiter();

        // Check rate limit before credential validation
        const rateCheck = await rateLimiter.checkRateLimit(credentials.email, ip);
        if (rateCheck.blocked) {
          throw new Error(
            `RATE_LIMITED|${rateCheck.reason}|${rateCheck.retryAfterSeconds}`,
          );
        }

        // Use the UserRepository + PasswordHasher ports — no direct prisma in app/
        const userRepository = container.getUserRepository();
        const passwordHasher = container.getPasswordHasher();

        const user = await userRepository.findByEmail(credentials.email);

        if (!user) {
          await rateLimiter.recordLoginAttempt(credentials.email, ip, false);
          return null;
        }

        const isValid = await passwordHasher.verify(credentials.password, user.passwordHash);

        if (!isValid) {
          await rateLimiter.recordLoginAttempt(credentials.email, ip, false);
          return null;
        }

        // Record successful attempt before email verification gate
        await rateLimiter.recordLoginAttempt(credentials.email, ip, true);

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
