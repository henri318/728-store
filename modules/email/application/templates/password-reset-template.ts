import { escapeHtml } from '@/shared/kernel/escape-html';
import {
  buildEmailShell,
  type EmailTemplateRenderer,
  resolveTemplateLocale,
} from './template-types';

export interface PasswordResetTemplateData {
  name: string;
  resetLink: string;
  expiresAt: string;
}

function sanitizeHttpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : '#';
  } catch {
    return '#';
  }
}

export const passwordResetTemplate: EmailTemplateRenderer<PasswordResetTemplateData> =
  {
    key: 'password-reset',
    render(locale, data) {
      const resolvedLocale = resolveTemplateLocale(locale);
      const subject = 'Restablecé tu contraseña';

      return {
        subject,
        htmlBody: buildEmailShell({
          locale: resolvedLocale,
          subject,
          bodyHtml: `
          <h1 style="margin: 0 0 16px; font-size: 24px;">Restablecé tu contraseña</h1>
          <p>Hola ${escapeHtml(data.name)},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>
            <a href="${escapeHtml(sanitizeHttpUrl(data.resetLink))}" style="display: inline-block; background: #4F46E5; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none;">Restablecer contraseña</a>
          </p>
          <p>Este enlace vence el ${escapeHtml(data.expiresAt)}.</p>
        `,
        }),
      };
    },
  };
