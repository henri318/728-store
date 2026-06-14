import { BrevoClient } from '@getbrevo/brevo';

if (!process.env.BREVO_API_KEY) {
  throw new Error('[Email] BREVO_API_KEY environment variable is required');
}

export const brevoClient = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY!,
});

export const FROM_EMAIL = 'no-reply@tudominio.com';
export const FROM_NAME = 'Modular Ecommerce';
