import { prisma } from '@/shared/infrastructure/prisma';
import { normalizeEmailLocale } from '../application/email-locale';
import type {
  EmailUserLookupPort,
  EmailUserLookupSnapshot,
} from '../domain/ports/email-user-lookup-port';

export class PrismaEmailUserLookup implements EmailUserLookupPort {
  private toSnapshot(row: {
    email: string | null;
    firstName: string;
    preferredLanguage: string | null;
  }): EmailUserLookupSnapshot | null {
    if (!row.email) return null;

    return {
      email: row.email,
      firstName: row.firstName,
      locale: normalizeEmailLocale(row.preferredLanguage),
    };
  }

  async findById(userId: string): Promise<EmailUserLookupSnapshot | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        preferredLanguage: true,
      },
    });

    if (!user) return null;
    return this.toSnapshot(user);
  }

  async findEmailByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return user?.email ?? null;
  }
}
