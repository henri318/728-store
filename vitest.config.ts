import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const IS_CI = !!process.env.CI;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    allowOnly: !IS_CI,
    pool: 'threads',
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/integration/**/*.test.ts', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
