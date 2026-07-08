import {
  orderCompletedTemplate,
  type OrderCompletedTemplateData,
} from './order-completed-template';
import {
  orderInProgressTemplate,
  type OrderInProgressTemplateData,
} from './order-in-progress-template';
import {
  orderPlacedTemplate,
  type OrderPlacedTemplateData,
} from './order-placed-template';
import {
  passwordResetTemplate,
  type PasswordResetTemplateData,
} from './password-reset-template';
import {
  sellerCreatedTemplate,
  type SellerCreatedTemplateData,
} from './seller-created-template';
import type { EmailTemplateRenderer } from './template-types';

export type EmailTemplateKey =
  | 'password-reset'
  | 'seller-created'
  | 'order-placed'
  | 'order-in-progress'
  | 'order-completed';

export interface EmailTemplateDataMap {
  'password-reset': PasswordResetTemplateData;
  'seller-created': SellerCreatedTemplateData;
  'order-placed': OrderPlacedTemplateData;
  'order-in-progress': OrderInProgressTemplateData;
  'order-completed': OrderCompletedTemplateData;
}

export const emailTemplateRegistry = {
  'password-reset': passwordResetTemplate,
  'seller-created': sellerCreatedTemplate,
  'order-placed': orderPlacedTemplate,
  'order-in-progress': orderInProgressTemplate,
  'order-completed': orderCompletedTemplate,
} as const satisfies {
  [K in EmailTemplateKey]: EmailTemplateRenderer<EmailTemplateDataMap[K]>;
};

export function renderEmailTemplate<K extends EmailTemplateKey>(
  key: K,
  locale: string,
  data: EmailTemplateDataMap[K],
) {
  const renderer = emailTemplateRegistry[key] as EmailTemplateRenderer<
    EmailTemplateDataMap[K]
  >;

  return renderer.render(locale, data);
}
