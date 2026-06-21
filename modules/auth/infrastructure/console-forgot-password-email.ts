import type { ForgotPasswordEmailPort } from '@/modules/auth/domain/forgot-password-email-port';

/**
 * ConsoleForgotPasswordEmail — dev-only mock implementation of ForgotPasswordEmailPort.
 *
 * Logs the password-reset token to the console instead of sending a real email.
 * This is intentionally a mock — production MUST bind a real email sender
 * (e.g., via Brevo or SendGrid) that dispatches actual emails.
 *
 * Architecture:
 *   Route  ── depends on  →  ForgotPasswordEmailPort (interface)
 *   Dev    ── binds        →  ConsoleForgotPasswordEmail (this class)
 *   Prod   ── binds        →  RealForgotPasswordEmail (future)
 */
export class ConsoleForgotPasswordEmail implements ForgotPasswordEmailPort {
  async send(email: string, token: string): Promise<void> {
    console.log('──────────────────────────────────────────────');
    console.log('[DEV] Password Reset Email (mock)');
    console.log(`  To:    ${email}`);
    console.log(`  Token: ${token}`);
    console.log(
      `  Link:  http://localhost:3000/es/auth/reset-password?token=${encodeURIComponent(token)}`,
    );
    console.log('──────────────────────────────────────────────');
  }
}
