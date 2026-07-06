/** Credentials for seeded test users. */
export const TEST_USERS = {
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- E2E test credentials
  admin: { email: 'admin@728store.com', password: 'Admin123!' },

  customer: { email: 'test@test.com', password: 'Test123!' },
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- E2E test credentials
  designer: { email: 'designer@test.com', password: 'Designer123!' },
} as const;
