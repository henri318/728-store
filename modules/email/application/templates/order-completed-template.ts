import { escapeHtml } from '@/shared/kernel/escape-html';
import {
  buildEmailShell,
  formatMoneyLabel,
  type EmailTemplateRenderer,
  resolveTemplateLocale,
} from './template-types';

export interface OrderCompletedTemplateData {
  name: string;
  orderNumber: string;
  total: number;
  currency: string;
  itemsCount: number;
}

export const orderCompletedTemplate: EmailTemplateRenderer<OrderCompletedTemplateData> =
  {
    key: 'order-completed',
    render(locale, data) {
      const resolvedLocale = resolveTemplateLocale(locale);
      const subject = 'Tu pedido está listo';

      return {
        subject,
        htmlBody: buildEmailShell({
          locale: resolvedLocale,
          subject,
          bodyHtml: `
          <h1 style="margin: 0 0 16px; font-size: 24px;">Tu pedido está listo</h1>
          <p>Hola ${escapeHtml(data.name)},</p>
          <p>Tu pedido <strong>#${escapeHtml(data.orderNumber)}</strong> ya está listo.</p>
          <p>Procesamos ${escapeHtml(String(data.itemsCount))} artículos por un total de ${escapeHtml(formatMoneyLabel(data.total, data.currency))}.</p>
        `,
        }),
      };
    },
  };
