# Proposal: Enforce Cross-Module Boundaries via ESLint

## Intent

The modular monolith architecture mandates no direct imports between modules — only domain events or shared kernel ports. ESLint currently has **zero rules** enforcing this. There are 65+ cross-module imports across 6+ modules, creating hidden coupling that defeats the purpose of the architecture. We need automated enforcement and a cleanup of existing violations.

## Scope

### In Scope

- ESLint `no-restricted-imports` rules blocking module-to-module imports
- Move `RoleId` to `shared/kernel/domain/value-objects/` (currently in `modules/roles`)
- Extract violated shared ports to `shared/kernel`:
  - `ResetTokenCodec` (from `modules/auth/domain/reset-token-codec-port`)
  - `ForgotPasswordEmailPort` (from `modules/auth/domain/forgot-password-email-port`)
  - `UsedResetTokenStorePort` (from `modules/auth/domain/used-reset-token-store-port`)
  - `UserRepository` interface (from `modules/users/domain/user-repository`)
  - `EmailQueueRepository` interface (from `modules/email/domain/email-queue-repository`)
  - `RoleRepository` interface (from `modules/roles/domain/role-repository`)
  - `Role` type (from `modules/roles/domain/roles`)
  - `PasswordHasher` interface (from `modules/users/domain/password-hasher`)
- Update all 65+ import paths across affected modules

### Out of Scope

- Event bus refactoring
- Outbox pattern changes
- Module internal restructuring
- Runtime validation or guards (ESLint only)

## Capabilities

### New Capabilities

- `module-boundary-enforcement`: ESLint rules and config preventing cross-module imports, with allow-list mechanism for type-only or extracted-port exceptions

### Modified Capabilities

None — this is infrastructure/governance, not business behavior.

## Approach

### Phase 1: ESLint Configuration

Create `no-restricted-imports` rules in `eslint.config.mjs`:

- **Blocked**: `@/modules/<any-module>/**` when imported from a different module
- **Allowed**: `@/shared/**`, `@/modules/events/**`, self-imports within same module
- **Allow-list**: Temporary exceptions for ports being extracted (removed in Phase 3)

### Phase 2: Extract Ports to Shared Kernel

Move interfaces to `shared/kernel/domain/ports/`:

- `user-repository.ts` — `UserRepository` interface
- `role-repository.ts` — `RoleRepository` interface
- `email-queue-repository.ts` — `EmailQueueRepository` interface
- `password-hasher.ts` — `PasswordHasher` interface
- `reset-token-codec.ts` — `ResetTokenCodec` interface
- `forgot-password-email.ts` — `ForgotPasswordEmailPort` interface
- `used-reset-token-store.ts` — `UsedResetTokenStorePort` interface
- `role.ts` — `Role` type

Move `RoleId` to `shared/kernel/domain/value-objects/role-id.ts`.

### Phase 3: Update Import Paths

Update all 65+ imports across users, auth, sellers, orders to point to shared/kernel.

### Phase 4: Remove Allow-list

Clean up ESLint config — no temporary exceptions needed.

### Phase 5: Verify

Run `npm run lint` and `npm test` to confirm zero violations and all tests pass.

## Affected Areas

| Area                                                          | Impact   | Description                                |
| ------------------------------------------------------------- | -------- | ------------------------------------------ |
| `eslint.config.mjs`                                           | Modified | Add `no-restricted-imports` rules          |
| `shared/kernel/domain/ports/`                                 | New      | 8 extracted port interfaces                |
| `shared/kernel/domain/value-objects/role-id.ts`               | New      | Moved from `modules/roles`                 |
| `modules/users/**`                                            | Modified | Update imports for ports + RoleId          |
| `modules/auth/**`                                             | Modified | Update imports for ports + Role            |
| `modules/sellers/**`                                          | Modified | Update imports for RoleId + PasswordHasher |
| `modules/orders/infrastructure/product-repository-adapter.ts` | Modified | Already type-only; will use shared port    |
| `modules/roles/domain/value-objects/role-id.ts`               | Removed  | Replaced by shared/kernel version          |

## Risks

| Risk                                             | Likelihood | Mitigation                                                     |
| ------------------------------------------------ | ---------- | -------------------------------------------------------------- |
| Breaking existing imports during port extraction | Medium     | Extract first, update paths second, verify with lint + tests   |
| Type-only imports blocked by ESLint rule         | Low        | Use `allowImportingRelatedExports` or path-pattern exceptions  |
| Barrel re-exports in modules break after move    | Low        | Check `index.ts` files in affected modules                     |
| Circular dependency in shared/kernel ports       | Low        | Ports reference only value-objects, not module implementations |

## Rollback Plan

1. Revert `eslint.config.mjs` — remove `no-restricted-imports` rules
2. Revert all import path changes via `git checkout`
3. Delete `shared/kernel/domain/ports/` directory
4. Restore `RoleId` to `modules/roles/domain/value-objects/`
5. Run `npm run lint` and `npm test` to confirm clean state

## Success Criteria

- [ ] `npm run lint` passes with zero violations
- [ ] `npm test` passes — no regressions
- [ ] Zero direct cross-module imports remain (only `@/shared/**` and `@/modules/events/**` allowed)
- [ ] All 8 extracted ports live in `shared/kernel/domain/ports/`
- [ ] `RoleId` lives in `shared/kernel/domain/value-objects/role-id.ts`
- [ ] No type-only imports from modules remain outside shared kernel
