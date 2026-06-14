import type { EmailSender } from '@/shared/kernel/email-sender';

/**
 * Development adapter — logs the email payload to the console instead of
 * sending anything. Keeps the queue/worker flow intact so the application
 * behaves identically end-to-end, with zero risk of emailing real addresses
 * while running `next dev`.
 */
export class ConsoleEmailSender implements EmailSender {
  async send(params: { to: string; subject: string; htmlBody: string }): Promise<void> {
    console.log(`[DEV EMAIL] To: ${params.to} | Subject: ${params.subject}`);
    console.log(`[DEV EMAIL] Body:\n${params.htmlBody}`);
  }
}
