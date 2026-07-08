const REQUIRED_ENV_VARIABLES = {
  apiKey: 'BREVO_API_KEY',
  fromAddress: 'EMAIL_FROM_ADDRESS',
  fromName: 'EMAIL_FROM_NAME',
} as const;

function readRequiredEnv(
  env: Record<string, string | undefined>,
  name: string,
): string {
  const value = env[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `[Email] ${name} environment variable is required and must not be empty`,
    );
  }

  return value.trim();
}

export function resolveBrevoClientConfig(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    apiKey: readRequiredEnv(env, REQUIRED_ENV_VARIABLES.apiKey),
    fromEmail: readRequiredEnv(env, REQUIRED_ENV_VARIABLES.fromAddress),
    fromName: readRequiredEnv(env, REQUIRED_ENV_VARIABLES.fromName),
  };
}
