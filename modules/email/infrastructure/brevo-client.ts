import { BrevoClient } from '@getbrevo/brevo';
import { resolveBrevoClientConfig } from './brevo-client-config';

const { apiKey, fromEmail, fromName } = resolveBrevoClientConfig();

export const brevoClient = new BrevoClient({
  apiKey,
});

export const FROM_EMAIL = fromEmail;
export const FROM_NAME = fromName;
