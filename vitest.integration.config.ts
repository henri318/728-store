import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.integration.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    globalSetup: './tests/global-setup-integration.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
