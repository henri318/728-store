import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

const MODULES = [
  'auth',
  'email',
  'orders',
  'payments',
  'presentation',
  'products',
  'roles',
  'tickets',
  'users',
];

/**
 * Cross-module boundary rules.
 *
 * Each module may only import from:
 *   - Its own domain/infrastructure/application layers
 *   - `events/` (shared event bus)
 *   - `shared/` (kernel, contracts, infrastructure)
 *
 * Direct imports between sibling modules are BLOCKED.
 * Cross-module communication MUST go through domain events or shared contracts.
 */
const moduleBoundaryRules = MODULES.map((mod) => ({
  files: [`modules/${mod}/**/*.ts`, `modules/${mod}/**/*.tsx`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: `^@/modules/(?!${mod}/|events/|shared/)`,
            message: `Module "${mod}" must not import directly from other modules. Use domain events or shared contracts instead.`,
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  // Base ESLint recommended
  eslintJs.configs.recommended,

  // TypeScript recommended + type-checked rules
  ...tseslint.configs.recommended,

  // ESLint React for TypeScript (replaces eslint-plugin-react)
  eslintReact.configs['recommended-typescript'],

  // React Hooks
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Next.js
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // TypeScript rules override - ignore underscore-prefixed variables
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Cross-module boundary enforcement
  ...moduleBoundaryRules,

  // Global ignores
  {
    ignores: ['node_modules/', '.next/', 'workers/'],
  },
);
