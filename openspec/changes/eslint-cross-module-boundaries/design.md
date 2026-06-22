# Design: Enforce Cross-Module Boundaries via ESLint

## Technical Approach

Add `no-restricted-imports` rule to `eslint.config.mjs` that blocks `@/modules/<A>/**` when imported from `@/modules/<B>/**` (where A≠B). Before enabling, move the 4 violating shared-port files from module domains into `shared/contracts/` and `shared/kernel/domain/value-objects/`, then update all 30+ import paths. Exclude `composition-root/` and `tests/` from the rule since they are cross-module wiring/test harnesses by design.

## Architecture Decisions

### Decision: Rule scope — which files are subject to the restriction

| Option                  | Tradeoff                                                             | Decision                                                   |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| All `.ts` files         | Catches everything; forces composition-root to use barrel re-exports | ❌ Composition-root is designed to import from all modules |
| `modules/**` only       | Blocks module→module; ignores app/, tests/, composition-root         | ✅ Chosen — modules are the boundary unit                  |
| `modules/**` + `app/**` | Blocks route handlers too; but routes legitimately import use cases  | ❌ Routes are presentation layer for specific modules      |

**Rationale**: The architectural boundary is between modules. `composition-root/` is the wiring layer (imports everything by design). `app/` routes are presentation for specific modules. `tests/` need cross-module access for setup. Only `modules/**` files need the restriction.

### Decision: Allow-list for shared code and events

| Pattern               | Rationale                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| `@/shared/**`         | Shared kernel is explicitly designed for cross-module consumption          |
| `@/modules/events/**` | Event bus + registry are the sanctioned inter-module communication channel |

### Decision: File destination — `shared/contracts/` vs `shared/kernel/domain/`

| Option                                           | Tradeoff                  | Decision                                                             |
| ------------------------------------------------ | ------------------------- | -------------------------------------------------------------------- |
| All to `shared/kernel/domain/ports/`             | Simple; single location   | ❌ Mixes identity values with behavioral ports                       |
| Split: identifiers in kernel, ports in contracts | Clear semantic separation | ✅ Chosen — `RoleId` is a value-object (kernel), ports are contracts |

**Rationale**: `RoleId` extends `EntityId` — it belongs with other identifiers. The ports (`ResetTokenCodec`, `UsedResetTokenStorePort`, `ForgotPasswordEmailPort`, `EmailSender`) define cross-module contracts, not kernel domain concepts.

### Decision: `composition-root/` exclusion strategy

| Option                               | Tradeoff                                        | Decision  |
| ------------------------------------ | ----------------------------------------------- | --------- |
| Exclude via `ignores` in rule config | Clean; composition-root never triggers the rule | ✅ Chosen |
| Add allow patterns for every module  | Verbose; breaks when new modules are added      | ❌        |

### Decision: Path separator handling in regex

**Choice**: Use `[/\\]` character class in all regex patterns.
**Rationale**: TypeScript imports use `/` by default, but Windows paths can appear in edge cases (dynamic imports, generated configs). The regex must be cross-platform safe.

## Data Flow

```
ESLint Rule (no-restricted-imports)
  │
  ├─ File in modules/X/** imports from modules/Y/** (X≠Y)?
  │   ├─ YES → BLOCK (error)
  │   └─ NO  → ALLOW
  │
  ├─ File in modules/X/** imports from shared/**?
  │   └─ ALLOW (shared is explicitly allowed)
  │
  ├─ File in modules/X/** imports from modules/events/**?
  │   └─ ALLOW (events is the sanctioned bus)
  │
  └─ File in modules/X/** imports from modules/X/**?
      └─ ALLOW (same-module import)
```

## ESLint Rule Configuration

```js
// In eslint.config.mjs — add as a new config block
{
  files: ['modules/**/*.ts', 'modules/**/*.tsx'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [],
      patterns: [
        {
          group: ['@/modules/events/**'],
          message: 'Events module is allowed — it is the sanctioned inter-module bus.',
        },
        {
          group: ['@/shared/**'],
          message: 'Shared kernel is allowed — it is designed for cross-module consumption.',
        },
        {
          group: ['@/modules/*/**'],
          message: 'Direct cross-module imports are forbidden. Use domain events, shared ports, or the composition root.',
          allowRelativeImports: false,
        },
      ],
    }],
  },
}
```

**Correction**: ESLint `no-restricted-imports` with `patterns` does NOT support "block X unless it matches Y". The correct approach uses **regex-based patterns** with negative lookahead:

```js
{
  files: ['modules/**/*.ts', 'modules/**/*.tsx'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [],
      patterns: [
        {
          // Block cross-module: importing from modules/B when file is in modules/A (A≠B)
          // This regex matches any @/modules/<name>/... path
          // The rule blocks ALL of them; we rely on the file-level `files` scope
          // plus manual allow-listing via pattern exceptions
          group: [
            '@/modules/*/domain/**',
            '@/modules/*/application/**',
            '@/modules/*/infrastructure/**',
            '@/modules/*/presentation/**',
          ],
          message: 'Direct cross-module imports are forbidden. Use domain events, shared ports, or the composition root.',
        },
      ],
    }],
  },
}
```

**Actually, this approach has a flaw** — it blocks same-module imports too (e.g., `modules/auth/application/` importing from `modules/auth/domain/`). The correct ESLint pattern uses **regex with backreference** to block cross-module but allow same-module. However, ESLint `no-restricted-imports` does NOT support backreferences.

### Final Rule Design: Two-pass approach

**Step 1**: Block ALL `@/modules/<any>/**` imports from `modules/` files.
**Step 2**: Allow same-module imports via a second pattern with `allowImportingRelatedExports` or by scoping the rule per-module.

**Actually, the cleanest approach**: Use a single regex pattern that matches cross-module imports, and handle same-module via `overrides` per module. But this is verbose for 11 modules.

**Pragmatic approach**: Block all `@/modules/` imports from `modules/` files, then use `eslint-disable` comments for same-module imports. This is too noisy.

### FINAL APPROACH: Custom regex with module name capture

The best working approach with ESLint `no-restricted-imports`:

```js
{
  files: ['modules/**/*.ts', 'modules/**/*.tsx'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [],
      patterns: [
        // Allow shared and events — these are NOT blocked
        {
          group: ['@/shared/**', '@/modules/events/**'],
          message: 'Allowed: shared kernel and events module.',
        },
        // Block cross-module: any @/modules/<name>/** import
        // This catches all module imports; same-module is handled separately
        {
          group: ['@/modules/*/domain/**', '@/modules/*/application/**', '@/modules/*/infrastructure/**', '@/modules/*/presentation/**'],
          message: 'Direct cross-module imports are forbidden. Use domain events, shared ports, or the composition root.',
        },
      ],
    }],
  },
}
```

**Problem**: The second pattern also blocks same-module imports (e.g., `modules/auth/application/` → `modules/auth/domain/`).

**Solution**: Do NOT use pattern-based blocking for same-module. Instead:

1. **Block pattern**: `@/modules/*/domain/**`, `@/modules/*/application/**`, `@/modules/*/infrastructure/**`, `@/modules/*/presentation/**`
2. **Allow same-module via file-scoped overrides**: For each module, add an override that allows its own imports.

**This is still verbose.** Let me think of a better approach.

### ACTUAL FINAL APPROACH: Per-module regex with negative lookahead

ESint `no-restricted-imports` patterns DO support regex. Use a regex with negative lookahead to block `@/modules/X/` when imported from `modules/Y/` where Y≠X. But ESLint doesn't support backreferences to match "current file's module name" in the import path.

**The pragmatic solution that works**:

Block ALL `@/modules/<name>/**` imports from `modules/` files. Add per-module overrides that allow same-module imports. Since there are 11 modules, this is manageable.

Actually, the simplest working approach: use a **single regex pattern** that matches any `@/modules/` import, and rely on the fact that the rule only applies to `modules/**/*.ts` files. Then add `allowImportingRelatedExports: true` if available, or use per-module override blocks.

Let me check what ESLint actually supports...

After research: The cleanest approach for this codebase is:

```js
// Block all cross-module imports from modules/ files
{
  files: ['modules/**/*.ts', 'modules/**/*.tsx'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@/modules/*/domain/**', '@/modules/*/application/**', '@/modules/*/infrastructure/**', '@/modules/*/presentation/**'],
          message: '...',
        },
      ],
    }],
  },
},
// Per-module overrides: allow same-module imports
...MODULES.map(mod => ({
  files: [`modules/${mod}/**/*.ts`, `modules/${mod}/**/*.tsx`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: [`@/modules/${mod}/**`],
          message: 'Same-module import (allowed).',
        },
        {
          group: ['@/modules/*/domain/**', '@/modules/*/application/**', '@/modules/*/infrastructure/**', '@/modules/*/presentation/**'],
          message: '...',
        },
      ],
    }],
  },
})),
```

**Wait** — this doesn't work either. ESLint merges rules; the per-module override doesn't REPLACE the block pattern, it ADDS to it. So the block still catches same-module imports.

**ACTUAL WORKING APPROACH**: The correct ESLint `no-restricted-imports` pattern uses **regex** (not glob patterns). Use a regex that captures the module name in the import path and matches it against the file's module. But ESLint doesn't support this.

**The real solution**: Use `no-restricted-imports` with a pattern that blocks ALL `@/modules/` imports, then use `allowedPaths` or `allowImportingRelatedExports` for same-module. Since ESLint 9+ doesn't have `allowImportingRelatedExports` in the flat config, the pragmatic approach is:

**Option A**: Block all `@/modules/` from `modules/` files. Add `// eslint-disable-next-line no-restricted-imports` for same-module imports. (Too noisy — dozens of disable comments.)

**Option B**: Use a custom ESLint plugin with backreference support. (Overkill.)

**Option C**: Use regex patterns that are per-module. Define the rule once per module with a regex that matches `@/modules/(?!<this-module>)/`. This requires 11 rule definitions but is the cleanest.

**Option D (CHOSEN)**: Use the `patterns` array with `regex` entries. For each module, add a pattern with negative lookahead. This requires generating 11 patterns but works correctly.

Actually, looking at the ESLint docs more carefully: `no-restricted-imports` with `patterns` uses minimatch-style globs, NOT regex. To use regex, you need the `regex` option instead of `group`.

```js
{
  patterns: [
    {
      regex: '^@/modules/(?!auth/)',
      message: '...',
    },
  ];
}
```

But this only works for one module at a time. We'd need 11 patterns.

**FINAL FINAL APPROACH (CHOSEN)**:

Use the `patterns` option with `regex` for each module. Each regex uses negative lookahead to allow same-module imports while blocking cross-module. This is the correct, working approach.

```js
const MODULES = [
  'auth',
  'email',
  'events',
  'orders',
  'payments',
  'presentation',
  'products',
  'roles',
  'sellers',
  'tickets',
  'users',
];

const crossModuleBlockPatterns = MODULES.filter((m) => m !== 'events') // events is always allowed
  .map((mod) => ({
    regex: `^@/modules/(?!${mod}/)`,
    message: `Cross-module import blocked. Module "${mod}" cannot import from other modules. Use domain events, shared ports, or the composition root.`,
  }));
```

**Wait** — this regex matches from the PERSPECTIVE of the importing file. But ESLint applies the same rule to ALL files. The regex `^@/modules/(?!auth/)` would block importing from non-auth modules when applied to auth files, but it would ALSO block importing from auth when applied to non-auth files.

The regex needs to match the IMPORT PATH, not the file path. So `^@/modules/(?!auth/)` means "any import path that starts with @/modules/ but NOT @/modules/auth/". This would be applied to files in `modules/auth/**` — meaning auth files can import from `@/modules/auth/` but not from other modules.

**But** the same pattern would also be applied to files in `modules/users/**` — and it would ALLOW `@/modules/auth/` imports from users (because the regex blocks non-auth, not non-users). That's wrong.

The issue is that `no-restricted-imports` patterns apply to the IMPORT PATH, not relative to the file. So we can't express "block imports from other modules" with a single pattern — we'd need per-file patterns.

**THE ACTUAL CORRECT APPROACH**:

Use `no-restricted-imports` with `paths` (not patterns) for specific blocked paths. But with 11 modules × 4 layers = 44 blocked paths, this is verbose.

**OR**: Use `overrides` in the ESLint config to apply different rules per module directory.

```js
// Base: block all module imports
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/modules/*/domain/**', '@/modules/*/application/**', '@/modules/*/infrastructure/**', '@/modules/*/presentation/**'],
        message: 'Cross-module imports blocked.',
      }],
    }],
  },
},
// Override per module: re-allow same-module imports
...MODULES.flatMap(mod => [{
  files: [`modules/${mod}/**/*.ts`, `modules/${mod}/**/*.tsx`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        // Allow same-module
        { group: [`@/modules/${mod}/**`], message: '' },
        // Allow shared + events
        { group: ['@/shared/**', '@/modules/events/**'], message: '' },
        // Block everything else
        { group: ['@/modules/*/domain/**', '@/modules/*/application/**', '@/modules/*/infrastructure/**', '@/modules/*/presentation/**'], message: '...' },
      ],
    }],
  },
}]),
```

**Wait** — in ESLint flat config, later configs override earlier ones for the SAME rule. But if two configs both define `no-restricted-imports`, the later one REPLACES the earlier one (not merges). So the per-module override would REPLACE the base rule, not add to it.

But the per-module override's patterns still include the block pattern. And the allow pattern for same-module comes first. In ESLint, when multiple patterns match, the FIRST matching pattern's message is used. But the rule still blocks if ANY pattern matches.

Actually, looking at the ESLint source: `no-restricted-imports` with `patterns` blocks the import if the import path matches ANY of the patterns. The `message` is just for the error message. So having both an allow pattern and a block pattern doesn't work — the block pattern still fires.

**THE REAL ANSWER**: ESLint `no-restricted-imports` patterns with `group` use minimatch globs. The glob `@/modules/*/domain/**` matches `@/modules/auth/domain/foo.ts`. There is NO way to say "match this BUT NOT when the file is in the same module" using minimatch.

The ONLY working approaches are:

1. Per-module `overrides` with the rule defined 11 times, each with a regex that blocks cross-module imports using negative lookahead relative to that module.
2. A custom ESLint plugin.
3. Use `import/no-restricted-paths` instead (which IS designed for this).

Let me check if `import/no-restricted-paths` is available...

Actually, the `eslint-plugin-import` package provides `import/no-restricted-paths` which is EXACTLY designed for this use case. It allows you to specify restricted zones with `from` and `zone` options.

```js
import restrictPaths from 'eslint-plugin-import/lib/rules/no-restricted-paths';

// Config:
{
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        // For each module, restrict imports from all OTHER modules
        ...MODULES.flatMap(mod =>
          MODULES.filter(other => other !== mod && other !== 'events').map(other => ({
            target: `./modules/${mod}`,
            from: `./modules/${other}`,
          }))
        ),
        // Allow shared and events from anywhere
      ],
    }],
  },
}
```

**But** `eslint-plugin-import` may not be installed and has compatibility issues with ESLint 9 flat config.

### TRULY FINAL APPROACH (what I'll recommend):

**Use `no-restricted-imports` with per-module `overrides` and regex patterns.**

For each module (except events), define a regex that blocks imports from other modules using negative lookahead. The regex is applied to the import path. Since ESLint applies the rule per-file, and the `files` glob in the override scopes it to the correct module, this works:

```js
const MODULES = [
  'auth',
  'email',
  'orders',
  'payments',
  'presentation',
  'products',
  'roles',
  'sellers',
  'tickets',
  'users',
];

// For each module, create an override that blocks imports from other modules
const moduleOverrides = MODULES.map((mod) => ({
  files: [`modules/${mod}/**/*.ts`, `modules/${mod}/**/*.tsx`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          // Block imports from all modules EXCEPT this one, events, and shared
          ...MODULES.filter(
            (other) => other !== mod && other !== 'events',
          ).flatMap((other) => [
            {
              group: [`@/modules/${other}/domain/**`],
              message: `Cross-module: ${mod} cannot import from ${other}/domain`,
            },
            {
              group: [`@/modules/${other}/application/**`],
              message: `Cross-module: ${mod} cannot import from ${other}/application`,
            },
            {
              group: [`@/modules/${other}/infrastructure/**`],
              message: `Cross-module: ${mod} cannot import from ${other}/infrastructure`,
            },
            {
              group: [`@/modules/${other}/presentation/**`],
              message: `Cross-module: ${mod} cannot import from ${other}/presentation`,
            },
          ]),
        ],
      },
    ],
  },
}));
```

This generates 10 modules × 9 other modules × 4 layers = 360 patterns. That's too many.

**Use regex instead of group**: For each module, one regex with negative lookahead:

```js
const moduleOverrides = MODULES.map((mod) => ({
  files: [`modules/${mod}/**/*.ts`, `modules/${mod}/**/*.tsx`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: `^@/modules/(?!${mod}/|events/|shared/)`,
            message: `Module "${mod}" cannot import from other modules. Use domain events, shared ports, or the composition root.`,
          },
        ],
      },
    ],
  },
}));
```

**This works!** The regex `^@/modules/(?!auth/|events/|shared/)` applied to files in `modules/auth/**` means:

- `@/modules/auth/domain/...` → matches `@/modules/` but NOT followed by `auth/` → does NOT match → ALLOWED ✓
- `@/modules/events/domain/...` → matches `@/modules/` but NOT followed by `events/` → does NOT match → ALLOWED ✓
- `@/shared/...` → doesn't start with `@/modules/` → does NOT match → ALLOWED ✓
- `@/modules/users/domain/...` → matches `@/modules/` and NOT followed by `auth/` → MATCHES → BLOCKED ✓

**This is correct.** 10 overrides (events excluded), each with one regex pattern.

## Final ESLint Configuration

```js
// eslint.config.mjs — addition to the config array

const MODULES = [
  'auth',
  'email',
  'orders',
  'payments',
  'presentation',
  'products',
  'roles',
  'sellers',
  'tickets',
  'users',
];

// Per-module overrides: each module can import from itself, events, and shared only
const moduleBoundaryRules = MODULES.map((mod) => ({
  files: [`modules/${mod}/**/*.ts`, `modules/${mod}/**/*.tsx`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            // Blocks @/modules/X/ where X is NOT this module, events, or shared
            regex: `^@/modules/(?!${mod}/|events/[domaininfrastructurepresentation]*|shared/)`,
            message: `Module "${mod}" cannot import from other modules. Use domain events, shared ports, or the composition root.`,
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  // ... existing config ...

  // Cross-module boundary enforcement
  ...moduleBoundaryRules,
);
```

**Note on the regex**: The regex `^@/modules/(?!auth/|events/|shared/)` is applied ONLY to the import path string. It doesn't check the file path — that's handled by the `files` glob in the override. So the regex just needs to answer: "Is this import path a cross-module import?"

**Correction on events regex**: `events/[domaininfrastructurepresentation]*` is wrong — it's a character class, not alternation. Use `events/(domain|infrastructure|application|presentation)/` or simply `events/` since we want to allow ALL events subpaths.

**Final regex**: `^@/modules/(?!${mod}/|events/|shared/)`

This allows:

- `@/modules/<this-module>/**` (same-module)
- `@/modules/events/**` (event bus)
- `@/shared/**` (shared kernel — doesn't start with @/modules/ so won't match anyway)

Wait — `@/shared/**` doesn't start with `@/modules/`, so the regex `^@/modules/...` won't match it at all. It's automatically allowed. We don't need `shared/` in the negative lookahead.

**Simplified regex**: `^@/modules/(?!${mod}/|events/)`

## File Changes

### Files to Move

| Source                                               | Destination                                                | Type moved         |
| ---------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| `modules/roles/domain/value-objects/role-id.ts`      | `shared/kernel/domain/value-objects/role-id.ts`            | Value object class |
| `modules/auth/domain/reset-token-codec-port.ts`      | `shared/contracts/security/reset-token-codec.ts`           | Interface + type   |
| `modules/auth/domain/used-reset-token-store-port.ts` | `shared/contracts/security/used-reset-token-store-port.ts` | Interface          |
| `modules/auth/domain/forgot-password-email-port.ts`  | `shared/contracts/email/forgot-password-email-port.ts`     | Interface          |
| `modules/email/domain/email-sender.ts`               | `shared/contracts/email/email-queue-port.ts`               | Interface          |

### Files to Create (barrel exports)

| File                                          | Purpose                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `shared/contracts/security/index.ts`          | Re-exports `ResetTokenCodec`, `ResetTokenPayload`, `UsedResetTokenStorePort` |
| `shared/contracts/email/index.ts`             | Re-exports `EmailSender`, `ForgotPasswordEmailPort`                          |
| `shared/contracts/index.ts`                   | Re-exports from `security/` and `email/`                                     |
| `shared/kernel/domain/value-objects/index.ts` | Re-exports all value objects including `RoleId`                              |

### Files to Delete

| File                                            | Reason          |
| ----------------------------------------------- | --------------- |
| `modules/roles/domain/value-objects/role-id.ts` | Moved to shared |

## Import Update Map

### `role-id.ts` move (17 files affected)

| File                                                                        | Old Import                                     | New Import                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `modules/roles/domain/entities/role.ts`                                     | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `modules/roles/domain/value-objects/role-id.ts` (deleted)                   | —                                              | —                                              |
| `modules/roles/infrastructure/prisma-role-repository.ts`                    | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `modules/roles/application/use-cases/seed-roles-use-case.ts`                | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `modules/roles/application/use-cases/create-role-use-case.ts`               | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `modules/users/infrastructure/prisma-user-repository.ts`                    | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `modules/users/domain/entities/user.ts`                                     | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `modules/users/application/use-cases/register-user-use-case.ts`             | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `modules/sellers/application/use-cases/create-seller-with-user-use-case.ts` | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/users/application/update-user.test.ts`                  | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/users/application/reset-password-use-case.test.ts`      | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/users/application/register-user-use-case.test.ts`       | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/users/application/forgot-password-use-case.test.ts`     | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/users/application/delete-user.test.ts`                  | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/users/application/change-password-use-case.test.ts`     | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/users/application/assign-role.test.ts`                  | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/unit/modules/roles/application/create-role.test.ts`                  | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |
| `tests/doubles/memory-user-repository.test.ts`                              | `@/modules/roles/domain/value-objects/role-id` | `@/shared/kernel/domain/value-objects/role-id` |

### `reset-token-codec-port.ts` move (5 files affected)

| File                                                              | Old Import                                     | New Import                                      |
| ----------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `modules/auth/infrastructure/jwt-reset-token-codec.ts`            | `@/modules/auth/domain/reset-token-codec-port` | `@/shared/contracts/security/reset-token-codec` |
| `modules/auth/infrastructure/base64-reset-token-codec.ts`         | `@/modules/auth/domain/reset-token-codec-port` | `@/shared/contracts/security/reset-token-codec` |
| `modules/users/application/use-cases/reset-password-use-case.ts`  | `@/modules/auth/domain/reset-token-codec-port` | `@/shared/contracts/security/reset-token-codec` |
| `modules/users/application/use-cases/forgot-password-use-case.ts` | `@/modules/auth/domain/reset-token-codec-port` | `@/shared/contracts/security/reset-token-codec` |
| `composition-root/container.ts`                                   | `@/modules/auth/domain/reset-token-codec-port` | `@/shared/contracts/security/reset-token-codec` |

### `used-reset-token-store-port.ts` move (3 files affected)

| File                                                             | Old Import                                          | New Import                                                |
| ---------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| `modules/auth/infrastructure/memory-used-reset-token-store.ts`   | `@/modules/auth/domain/used-reset-token-store-port` | `@/shared/contracts/security/used-reset-token-store-port` |
| `modules/users/application/use-cases/reset-password-use-case.ts` | `@/modules/auth/domain/used-reset-token-store-port` | `@/shared/contracts/security/used-reset-token-store-port` |
| `composition-root/container.ts`                                  | `@/modules/auth/domain/used-reset-token-store-port` | `@/shared/contracts/security/used-reset-token-store-port` |

### `forgot-password-email-port.ts` move (4 files affected)

| File                                                                    | Old Import                                         | New Import                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `modules/auth/infrastructure/console-forgot-password-email.ts`          | `@/modules/auth/domain/forgot-password-email-port` | `@/shared/contracts/email/forgot-password-email-port` |
| `modules/users/application/use-cases/forgot-password-use-case.ts`       | `@/modules/auth/domain/forgot-password-email-port` | `@/shared/contracts/email/forgot-password-email-port` |
| `tests/unit/modules/users/application/forgot-password-use-case.test.ts` | `@/modules/auth/domain/forgot-password-email-port` | `@/shared/contracts/email/forgot-password-email-port` |
| `composition-root/container.ts`                                         | `@/modules/auth/domain/forgot-password-email-port` | `@/shared/contracts/email/forgot-password-email-port` |

### `email-sender.ts` move (3 files affected)

| File                                                   | Old Import                            | New Import                                  |
| ------------------------------------------------------ | ------------------------------------- | ------------------------------------------- |
| `modules/email/infrastructure/console-email-sender.ts` | `@/modules/email/domain/email-sender` | `@/shared/contracts/email/email-queue-port` |
| `modules/email/infrastructure/brevo-email-sender.ts`   | `@/modules/email/domain/email-sender` | `@/shared/contracts/email/email-queue-port` |
| `composition-root/container.ts`                        | `@/modules/email/domain/email-sender` | `@/shared/contracts/email/email-queue-port` |

### Total: 32 import path updates across 28 unique files

(Note: `composition-root/container.ts` appears in 5 move lists — it has 5 imports to update. `modules/users/application/use-cases/reset-password-use-case.ts` appears in 2 lists — 2 imports to update.)

## Barrel Export Strategy

### `shared/contracts/security/index.ts`

```ts
export type { ResetTokenPayload, ResetTokenCodec } from './reset-token-codec';
export type { UsedResetTokenStorePort } from './used-reset-token-store-port';
```

### `shared/contracts/email/index.ts`

```ts
export type { EmailSender } from './email-queue-port';
export type { ForgotPasswordEmailPort } from './forgot-password-email-port';
```

### `shared/contracts/index.ts`

```ts
export * from './security';
export * from './email';
```

### `shared/kernel/domain/value-objects/index.ts`

```ts
export { EntityId } from './entity-id';
export { RoleId } from './role-id';
export { Address } from './address';
export { Currency } from './currency';
export { Email } from './email';
export { Money } from './money';
export { OrderId } from './order-id';
export { PasswordHash } from './password-hash';
export { PaymentId } from './payment-id';
export { ProductId } from './product-id';
export { SellerId } from './seller-id';
export { TicketId } from './ticket-id';
export { UserId } from './user-id';
```

**Note**: Existing importers can continue using deep paths (`@/shared/contracts/security/reset-token-codec`) or switch to barrel imports (`@/shared/contracts/security`). Both work. Barrel exports are optional convenience — not required for the ESLint rule to function.

## Testing Strategy

| Layer       | What to Test                     | Approach                                                                                                          |
| ----------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ESLint rule | Cross-module import blocked      | Create a temp file in `modules/auth/` that imports `@/modules/users/domain/user-repository` — expect ESLint error |
| ESLint rule | Same-module import allowed       | Create a temp file in `modules/auth/application/` that imports `@/modules/auth/domain/secrets` — expect no error  |
| ESLint rule | Shared/events allowed            | Create a temp file in `modules/auth/` that imports `@/shared/kernel/app-error` — expect no error                  |
| TypeScript  | All moved files resolve          | Run `tsc --noEmit` — all imports must resolve to valid modules                                                    |
| Unit tests  | Existing tests pass              | Run `npm test` — no regressions from moved files                                                                  |
| Integration | Composition root wires correctly | Run `npm run build` — Next.js build must succeed                                                                  |

### Verification commands

```bash
# 1. Verify ESLint catches violations
echo 'import { UserRepository } from "@/modules/users/domain/user-repository";' > modules/auth/test-violation.ts
npx eslint modules/auth/test-violation.ts  # expect error
rm modules/auth/test-violation.ts

# 2. Verify same-module imports work
echo 'import { SecretsPort } from "@/modules/auth/domain/secrets";' > modules/auth/test-same-module.ts
npx eslint modules/auth/test-same-module.ts  # expect no error
rm modules/auth/test-same-module.ts

# 3. Verify TypeScript resolution
npx tsc --noEmit

# 4. Verify all tests pass
npm test

# 5. Verify build
npm run build
```

## Migration Order

Execute in this exact sequence to avoid broken states:

1. **Create directories** (no files depend on these yet)
   - `shared/contracts/security/`
   - `shared/contracts/email/`

2. **Copy files to new locations** (do NOT delete originals yet)
   - Copy `modules/roles/domain/value-objects/role-id.ts` → `shared/kernel/domain/value-objects/role-id.ts`
   - Copy `modules/auth/domain/reset-token-codec-port.ts` → `shared/contracts/security/reset-token-codec.ts`
   - Copy `modules/auth/domain/used-reset-token-store-port.ts` → `shared/contracts/security/used-reset-token-store-port.ts`
   - Copy `modules/auth/domain/forgot-password-email-port.ts` → `shared/contracts/email/forgot-password-email-port.ts`
   - Copy `modules/email/domain/email-sender.ts` → `shared/contracts/email/email-queue-port.ts`

3. **Create barrel exports**
   - `shared/contracts/security/index.ts`
   - `shared/contracts/email/index.ts`
   - `shared/contracts/index.ts`
   - `shared/kernel/domain/value-objects/index.ts`

4. **Update all import paths** (32 updates across 28 files — see Import Update Map)
   - Use find-and-replace for each old→new path pair
   - Verify TypeScript still compiles after each batch

5. **Delete original files**
   - `modules/roles/domain/value-objects/role-id.ts`
   - `modules/auth/domain/reset-token-codec-port.ts`
   - `modules/auth/domain/used-reset-token-store-port.ts`
   - `modules/auth/domain/forgot-password-email-port.ts`
   - `modules/email/domain/email-sender.ts`

6. **Add ESLint rule** to `eslint.config.mjs`
   - Add the `moduleBoundaryRules` configuration block

7. **Verify**
   - `npx tsc --noEmit` — TypeScript compilation
   - `npx eslint modules/` — ESLint passes with zero violations
   - `npm test` — all unit tests pass
   - `npm run build` — Next.js build succeeds

## Open Questions

- [ ] Should `composition-root/` be explicitly excluded from the ESLint rule via `ignores`, or is it already outside the `modules/**/*.ts` file scope? → **Answer**: It's outside `modules/` so it's already excluded by the `files` glob. No action needed.
- [ ] Should `modules/email/domain/email-sender.ts` be renamed to `email-queue-port.ts` at the destination, or keep the original name? → **Recommendation**: Rename to `email-queue-port.ts` per the approved structure. The interface name (`EmailSender`) stays the same — only the file name changes.
- [ ] The approved structure shows `shared/kernel/domain/events/` and `shared/kernel/domain/errors/` as "exists" but they don't exist yet. Should they be created as part of this change? → **Answer**: No — they are out of scope. The existing `shared/kernel/app-error.ts` (errors) and `modules/events/` (events) serve these purposes currently.
