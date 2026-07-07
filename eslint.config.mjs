import json from '@eslint/json';
import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import i18next from 'eslint-plugin-i18next';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';

const CODE_FILES = ['**/*.{js,jsx,mjs,cjs,ts,tsx}'];

const scopeToCodeFiles = (config) => ({
  ...config,
  files: CODE_FILES,
});

const MODULES = [
  'auth',
  'email',
  'orders',
  'payments',
  'presentation',
  'products',
  'roles',
  'search-history',
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

export default [
  // Base ESLint recommended
  scopeToCodeFiles(eslintJs.configs.recommended),

  // TypeScript recommended + type-checked rules
  ...tseslint.configs.recommended.map((c) => scopeToCodeFiles(c)),

  // ESLint React for TypeScript (replaces eslint-plugin-react)
  scopeToCodeFiles(eslintReact.configs['recommended-typescript']),

  // React Hooks
  {
    files: CODE_FILES,
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Next.js
  {
    files: CODE_FILES,
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // 👇 SonarJS - usa su config plana "recommended"
  scopeToCodeFiles(sonarjs.configs.recommended),

  // 👇 Unicorn - también trae flat config recomendada
  scopeToCodeFiles(unicorn.configs.recommended),

  scopeToCodeFiles({
    ignores: ['**/tests/**'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'jsx-attributes': {
            include: ['alt', 'title', 'placeholder', 'aria-label'],
            exclude: ['className', 'style', 'type', 'id', 'data-testid'],
          },
          words: {
            exclude: [
              '[0-9!-/:-@[-`{-~]+',
              '^[A-Z_-]+$',
              '^[\u{B7}\u{D7}\u{2190}-\u{21FF}\u{2212}\u{2713}-\u{2717}]+$',
            ],
          },
        },
      ],
    },
  }),
  scopeToCodeFiles({
    rules: {
      // Unicorn tiene reglas muy opinadas que suelen chocar con convenciones existentes
      'unicorn/prevent-abbreviations': 'off', // evita forzar renombrar req->request, err->error, etc.
      'unicorn/filename-case': 'off', // si no seguís kebab-case estricto en nombres de archivo
      'unicorn/no-null': 'off', // muchos proyectos usan null intencionalmente (ej. React)
      'unicorn/prefer-module': 'off', // si tenéis algún archivo CJS (configs, scripts)
      'unicorn/name-replacements': 'off',
      'unicorn/import-style': 'off',

      'unicorn/no-top-level-assignment-in-function': 'off',
      'unicorn/consistent-class-member-order': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/prefer-await': 'off',
      'unicorn/prefer-export-from': 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/prefer-split-limit': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/consistent-conditional-object-spread': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'unicorn/prefer-type-error': 'off',
      'unicorn/no-computed-property-existence-check': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/no-unsafe-string-replacement': 'off',
      'unicorn/prefer-unicode-code-point-escapes': 'off',
      'unicorn/prefer-early-return': 'off',
      'unicorn/require-array-sort-compare': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/no-array-sort': 'off',

      // SonarJS: ajustar el umbral de complejidad cognitiva si el default es muy estricto
      // 'sonarjs/cognitive-complexity': ['warn', 15],
    },
  }),
  // Vitest no implementa .toBeTrue() / .toBeFalse() que sonarjs exige.
  // Usamos .toBe(true) / .toBe(false) que es el estándar de vitest.
  // IPs y passwords hardcoded en tests son datos de prueba esperables.
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    rules: {
      'sonarjs/prefer-specific-assertions': 'off',
      'sonarjs/no-hardcoded-ip': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
    },
  },
  // prisma/seed.ts se compila con esbuild en formato CJS,
  // que no soporta top-level await. Deshabilitamos reglas
  // que obligan a usarlo.
  {
    files: ['prisma/seed.ts'],
    rules: {
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-async-promise-finally': 'off',
    },
  },

  // JSON / JSONC / JSON5
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    language: 'json/json',
    ...json.configs.recommended,
  },
  {
    files: ['**/*.jsonc'],
    ignores: ['.markdownlint-cli2.jsonc'],
    language: 'json/jsonc',
    ...json.configs.recommended,
  },
  {
    files: ['**/*.json5'],
    language: 'json/json5',
    ...json.configs.recommended,
  },

  // TypeScript rules override - ignore underscore-prefixed variables
  {
    files: CODE_FILES,
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
];
