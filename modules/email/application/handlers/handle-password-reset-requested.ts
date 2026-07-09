import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import { getBaseUrl } from '@/shared/kernel/config';
import type { EmailUserLookupPort } from '../../domain/ports/email-user-lookup-port';
import { renderEmailTemplate } from '../templates/template-registry';

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
}

export class HandlePasswordResetRequested {
  constructor(
    private readonly emailQueueRepository: EmailQueueRepository,
    private readonly emailUserLookup: EmailUserLookupPort,
  ) {}

  async handle(
    payload: PasswordResetRequestedPayload | null | undefined,
  ): Promise<void> {
    if (!payload) return;
    if (
      !payload.userId ||
      !payload.email ||
      !payload.token ||
      !payload.expiresAt
    ) {
      return;
    }

    const user = await this.emailUserLookup.findById(payload.userId);
    if (!user) return;

    const resetLink = `${getBaseUrl()}/es/auth/reset-password?token=${encodeURIComponent(payload.token)}`;
    const rendered = renderEmailTemplate('password-reset', user.locale, {
      name: user.firstName,
      resetLink,
      expiresAt: payload.expiresAt,
    });

    await this.emailQueueRepository.create({
      to: user.email,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      template: 'password-reset',
      metadata: {
        userId: payload.userId,
        expiresAt: payload.expiresAt,
      },
      idempotencyKey: buildIdempotencyKey(
        'password-reset',
        user.email,
        payload.token,
      ),
    });
  }
}
