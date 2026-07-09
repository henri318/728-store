import { describe, expect, it } from 'vitest';
import { resolveBrevoClientConfig } from '@/modules/email/infrastructure/brevo-client-config';

describe('resolveBrevoClientConfig', () => {
  it('reads the Brevo api key and sender fields from env', () => {
    expect(
      resolveBrevoClientConfig({
        BREVO_API_KEY: 'test-api-key',
        EMAIL_FROM_ADDRESS: 'no-reply@example.com',
        EMAIL_FROM_NAME: 'Store Team',
      }),
    ).toEqual({
      apiKey: 'test-api-key',
      fromEmail: 'no-reply@example.com',
      fromName: 'Store Team',
    });
  });

  it.each([
    {
      env: {
        BREVO_API_KEY: '',
        EMAIL_FROM_ADDRESS: 'no-reply@example.com',
        EMAIL_FROM_NAME: 'Store Team',
      },
      name: 'BREVO_API_KEY',
    },
    {
      env: {
        BREVO_API_KEY: 'test-api-key',
        EMAIL_FROM_ADDRESS: ' '.repeat(3),
        EMAIL_FROM_NAME: 'Store Team',
      },
      name: 'EMAIL_FROM_ADDRESS',
    },
    {
      env: {
        BREVO_API_KEY: 'test-api-key',
        EMAIL_FROM_ADDRESS: 'no-reply@example.com',
        EMAIL_FROM_NAME: undefined,
      },
      name: 'EMAIL_FROM_NAME',
    },
  ])('throws a clear error when $name is missing or empty', ({ env, name }) => {
    expect(() => resolveBrevoClientConfig(env)).toThrow(
      `[Email] ${name} environment variable is required and must not be empty`,
    );
  });
});
