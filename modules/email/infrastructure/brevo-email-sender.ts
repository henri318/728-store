import type { EmailSender } from '@/modules/email/domain/email-sender';

/**
 * Production adapter — dispatches emails via the Brevo transactional API.
 *
 * This adapter ONLY sends. Queueing is the worker's concern; this class
 * encapsulates the network call to Brevo so it can be swapped for a different
 * provider (or a fake in tests) without touching the worker.
 *
 * The Brevo SDK is loaded lazily via dynamic `import()` so the module-level
 * check for `BREVO_API_KEY` only runs when `send()` is actually invoked —
 * this lets the production container statically import this class even
 * when the env var is not set (e.g. in dev where ConsoleEmailSender is
 * used instead, or in tests that never call send()).
 */
export class BrevoEmailSender implements EmailSender {
  private async getClient() {
    const { brevoClient, FROM_EMAIL, FROM_NAME } =
      await import('./brevo-client');
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
