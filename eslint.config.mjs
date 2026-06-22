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
 * Direct imports between sibling modules are BLOCKED in domain/ and application/.
 * Infrastructure layer MAY import from other modules' domain/ for adapter pattern.
 * Cross-module communication MUST go through domain events or shared contracts.
 */
const moduleBoundaryRules = MODULES.flatMap((mod) => [
  // Rule 1: Block domain/ and application/ from importing other modules
  {
    files: [
      `modules/${mod}/domain/**/*.ts`,
      `modules/${mod}/domain/**/*.tsx`,
      `modules/${mod}/application/**/*.ts`,
      `modules/${mod}/application/**/*.tsx`,
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^@/modules/(?!${mod}/|events/|shared/)`,
              message: `Module "${mod}" domain/application must not import directly from other modules. Use domain events or shared contracts instead.`,
            },
          ],
        },
      ],
    },
  },
  // Rule 2: Infrastructure MAY import from other modules' domain/ (adapter pattern)
  // But MUST NOT import from other modules' application/ or infrastructure/
  {
    files: [
      `modules/${mod}/infrastructure/**/*.ts`,
      `modules/${mod}/infrastructure/**/*.tsx`,
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^@/modules/(?!${mod}/|events/|shared/)([^/]+)/(?!domain/)`,
              message: `Module "${mod}" infrastructure may only import from other modules' domain layer (adapter pattern). Application and infrastructure layers are blocked.`,
            },
          ],
        },
      ],
    },
  },
]);

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
