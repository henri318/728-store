/**
 * ForgotPasswordEmailPort — the port for sending password-reset emails.
 *
 * Architecture:
 *   ForgotPasswordUseCase  ── depends on  →  this port (DI)
 *   Mock implementation    ── implements   →  logs token to console (dev only)
 *   Real implementation    ── implements   →  send via EmailSender + token URL (future)
 *
 * This is a hexagonal port — the use case knows send() but never knows
 * whether it's a console mock or a real email provider.
 *
 * The mock is safe because `next dev` never sends real emails; it just
 * logs the reset token so developers can paste it into the reset form.
 */
export interface ForgotPasswordEmailPort {
  /** Send a password-reset email containing the token.
   *  @param email — recipient email address
   *  @param token — the password-reset token to include in the email
   */
  send(email: string, token: string): Promise<void>;
}
