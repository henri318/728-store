import { defineConfig, devices } from '@playwright/test';

const IS_CI = !!process.env.CI;
const isExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI ? 'github' : 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: isExternalServer
    ? undefined
    : {
        command: 'npm run start',
        url: `${baseURL}/api/health`,
        reuseExistingServer: !IS_CI,
        timeout: 30_000,
      },
});
