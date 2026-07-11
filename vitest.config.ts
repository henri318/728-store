import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const IS_CI = !!process.env.CI;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    allowOnly: !IS_CI,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./tests/setup-node.ts'],
          include: ['tests/unit/**/*.test.ts'],
          exclude: ['node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'unit-react',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/unit/**/*.test.tsx'],
          exclude: ['node_modules/**'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
