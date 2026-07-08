import { escapeHtml } from '@/shared/kernel/escape-html';
import {
  buildEmailShell,
  type EmailTemplateRenderer,
  resolveTemplateLocale,
} from './template-types';

export interface SellerCreatedTemplateData {
  name: string;
  sellerName: string;
}

export const sellerCreatedTemplate: EmailTemplateRenderer<SellerCreatedTemplateData> =
  {
    key: 'seller-created',
    render(locale, data) {
      const resolvedLocale = resolveTemplateLocale(locale);
      const subject = 'Tu cuenta de vendedor fue creada';

      return {
        subject,
        htmlBody: buildEmailShell({
          locale: resolvedLocale,
          subject,
          bodyHtml: `
          <h1 style="margin: 0 0 16px; font-size: 24px;">Tu cuenta de vendedor fue creada</h1>
          <p>Hola ${escapeHtml(data.name)},</p>
          <p>Tu tienda <strong>${escapeHtml(data.sellerName)}</strong> ya está lista para empezar a recibir pedidos.</p>
        `,
        }),
      };
    },
  };
