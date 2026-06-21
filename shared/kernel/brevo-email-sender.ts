import type { EmailSender } from './email-sender';

/**
 * Production adapter — dispatches emails via the Brevo transactional API.
 *
 * This adapter ONLY sends. Queueing is the worker's concern; this class
 * encapsulates the network call to Brevo so it can be swapped for a different
 * provider (or a fake in tests) without touching the worker.
 *
 * Brevo client is lazy-loaded to avoid crashing at import time when
 * BREVO_API_KEY is not set (e.g. during `next dev` without .env.local).
 */
export class BrevoEmailSender implements EmailSender {
  private async getClient() {
    const { brevoClient, FROM_EMAIL, FROM_NAME } =
      await import('@/modules/email/infrastructure/brevo-client');
    return { brevoClient, FROM_EMAIL, FROM_NAME };
  }

  async send(params: {
    to: string;
    subject: string;
    htmlBody: string;
  }): Promise<void> {
    const { brevoClient, FROM_EMAIL, FROM_NAME } = await this.getClient();
    await brevoClient.transactionalEmails.sendTransacEmail({
      subject: params.subject,
      htmlContent: params.htmlBody,
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: params.to }],
    });
  }
}
