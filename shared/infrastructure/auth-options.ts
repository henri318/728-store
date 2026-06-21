import { NextAuthOptions } from 'next-auth';
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
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const ip =
          (req?.headers as Record<string, string | string[] | undefined>)?.[
            'x-forwarded-for'
          ]
            ?.toString()
            .split(',')[0]
            ?.trim() ||
          (req?.headers as Record<string, string | string[] | undefined>)?.[
            'x-real-ip'
          ]?.toString() ||
          'unknown';

        // RateLimiter comes from the container — no direct infra import in app/
        const rateLimiter = container.getRateLimiter();

        // Check rate limit before credential validation
        const rateCheck = await rateLimiter.checkRateLimit(
          credentials.email,
          ip,
        );
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

        const isValid = await passwordHasher.verify(
          credentials.password,
          user.passwordHash.value,
        );

        if (!isValid) {
          await rateLimiter.recordLoginAttempt(credentials.email, ip, false);
          return null;
        }

        // Soft-delete gate — reject login if account is deactivated
        // Do NOT leak whether account exists — return null same as wrong password
        if (user.deletedAt) {
          await rateLimiter.recordLoginAttempt(credentials.email, ip, false);
          return null;
        }

        // Record successful attempt only after ALL checks pass
        await rateLimiter.recordLoginAttempt(credentials.email, ip, true);

        const displayName = `${user.firstName} ${user.lastName}`.trim();

        return {
          id: user.userId.value,
          name: displayName,
          email: user.email.value,
          role: user.roleId.value,
          emailVerified: user.emailVerified,
        };
      },
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
    async signIn({ user }) {
      // Reject login if account has been soft-deleted
      // For credentials provider, this is also checked in authorize(),
      // but this signIn callback covers OAuth providers (Google) as well.
      if (user.email) {
        const userRepo = container.getUserRepository();
        const existing = await userRepo.findByEmail(user.email);
        if (existing?.deletedAt) {
          return false; // Reject sign-in
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // emailVerified: credentials provider sets it from authorize() return;
        // OAuth users are pre-verified by the provider, so set a synthetic date
        token.emailVerified =
          user.emailVerified ?? (account ? new Date().toISOString() : null);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
};
