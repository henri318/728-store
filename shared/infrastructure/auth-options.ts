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

        // OAuth users without a password cannot login via credentials
        if (!user.passwordHash) {
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
    async signIn({ user, account }) {
      if (!user.email) return false;

      const userRepo = container.getUserRepository();
      const existing = await userRepo.findByEmail(user.email);

      // Reject login if account has been soft-deleted
      if (existing?.deletedAt) {
        return false;
      }

      // OAuth provider: auto-create user on first login
      if (
        account?.provider &&
        account.provider !== 'credentials' &&
        !existing
      ) {
        const { UserId } =
          await import('@/shared/kernel/domain/value-objects/user-id');
        const { Email } =
          await import('@/shared/kernel/domain/value-objects/email');
        const { RoleId } =
          await import('@/shared/kernel/domain/identifiers/role-id');

        const names = (user.name ?? '').split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';

        const newUser = await userRepo.save({
          userId: UserId.create(user.id),
          email: Email.create(user.email),
          firstName,
          lastName,
          address: null,
          roleId: RoleId.create('CUSTOMER'),
          passwordHash: null,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Patch the NextAuth user object so jwt callback picks up DB id + role
        user.id = newUser.userId.value;
        user.role = newUser.roleId.value;
        return true;
      }

      // Existing user: propagate DB id + role to jwt
      if (existing) {
        user.id = existing.userId.value;
        user.role = existing.roleId.value;
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
        session.user.id = token.id ?? '';
        session.user.role = token.role ?? 'GUEST';
        session.user.emailVerified = token.emailVerified ?? null;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
};
