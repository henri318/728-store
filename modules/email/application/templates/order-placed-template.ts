import { escapeHtml } from '@/shared/kernel/escape-html';
import {
  buildEmailShell,
  formatMoneyLabel,
  type EmailTemplateRenderer,
  resolveTemplateLocale,
} from './template-types';

export interface OrderPlacedTemplateData {
  name: string;
  orderNumber: string;
  total: number;
  currency: string;
  itemsCount: number;
}

export const orderPlacedTemplate: EmailTemplateRenderer<OrderPlacedTemplateData> =
  {
    key: 'order-placed',
    render(locale, data) {
      const resolvedLocale = resolveTemplateLocale(locale);
      const subject = 'Confirmamos tu pedido';

      return {
        subject,
        htmlBody: buildEmailShell({
          locale: resolvedLocale,
          subject,
          bodyHtml: `
          <h1 style="margin: 0 0 16px; font-size: 24px;">Confirmamos tu pedido</h1>
          <p>Hola ${escapeHtml(data.name)},</p>
          <p>Recibimos tu pedido <strong>#${escapeHtml(data.orderNumber)}</strong>.</p>
          <p>Incluye ${escapeHtml(String(data.itemsCount))} artículos y tiene un total de ${escapeHtml(formatMoneyLabel(data.total, data.currency))}.</p>
        `,
        }),
      };
    },
  };
