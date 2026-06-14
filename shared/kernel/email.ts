import { BrevoClient } from '@getbrevo/brevo';

if (!process.env.BREVO_API_KEY) {
  throw new Error('[Email] BREVO_API_KEY environment variable is required');
}

export const brevoClient = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY!,
});

export const FROM_EMAIL = 'no-reply@tudominio.com';
export const FROM_NAME = 'Modular Ecommerce';

/**
 * Escape user-controlled values before interpolating into HTML email templates.
 * Prevents XSS via the recipient's name (or any other user input rendered as HTML).
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
