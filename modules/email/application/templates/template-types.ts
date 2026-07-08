import { escapeHtml } from '@/shared/kernel/escape-html';
import { DEFAULT_EMAIL_LOCALE, normalizeEmailLocale } from '../email-locale';

export { DEFAULT_EMAIL_LOCALE } from '../email-locale';

export interface EmailTemplateResult {
  subject: string;
  htmlBody: string;
}

export interface EmailTemplateRenderer<TData> {
  readonly key: string;
  render(locale: string, data: TData): EmailTemplateResult;
}

export function resolveTemplateLocale(
  _locale: string | null | undefined,
): typeof DEFAULT_EMAIL_LOCALE {
  return normalizeEmailLocale(_locale);
}

export function formatMoneyLabel(amount: number, currency: string): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `${currency} ${safeAmount.toFixed(2)}`;
}

export function buildEmailShell(input: {
  locale: string;
  subject: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html lang="${escapeHtml(input.locale)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; padding: 24px;">
    ${input.bodyHtml}
  </body>
</html>`;
}
