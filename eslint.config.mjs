import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

/**
 * Custom rule: no-cross-module-imports
 * Prevents domain layer from importing from other modules.
 * Only allows imports from:
 *   - Own module (./ or ../ within same module)
 *   - shared/kernel
 *   - shared/authorization
 *   - External packages
 */
const noCrossModuleImports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent cross-module imports in domain layer",
      category: "Architecture",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const filePath = context.filename;

        // Only apply to domain layer files
        if (!filePath.includes("/domain/")) return;

        // Allow relative imports (own module)
        if (importPath.startsWith(".")) return;

        // Allow shared imports
        if (importPath.startsWith("@/shared/")) return;

        // Allow external packages
        if (!importPath.startsWith("@/modules/")) return;

        // Extract module name from import path
        const importedModule = importPath.split("/")[2]; // @/modules/{module}/...
        const currentModule = filePath.split("/modules/")[1]?.split("/")[0];

        // Allow imports from own module
        if (importedModule === currentModule) return;

        // Block cross-module imports
        context.report({
          node,
          message: `Cross-module import forbidden: "${importPath}" in domain layer. Domain must only import from own module, shared/kernel, or external packages.`,
        });
      },
    };
  },
};

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

  // Global ignores
  {
    ignores: ['node_modules/', '.next/', 'workers/'],
  },

  // Custom architecture rules
  {
    plugins: { "custom": { rules: { "no-cross-module-imports": noCrossModuleImports } } },
    rules: {
      "custom/no-cross-module-imports": "error",
    },
  },
);
