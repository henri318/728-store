# Tasks: Hexagonal Architecture Cleanup

## Review Workload Forecast

| Field                   | Value                                              |
| ----------------------- | -------------------------------------------------- |
| Estimated changed lines | 350–450                                            |
| 400-line budget risk    | Medium                                             |
| Chained PRs recommended | No (single PR with auto-forecast)                  |
| Suggested split         | Single PR — all phases are mechanical import moves |
| Delivery strategy       | single-pr                                          |
| Chain strategy          | size-exception                                     |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                   | Likely PR | Notes                                                         |
| ---- | ---------------------- | --------- | ------------------------------------------------------------- |
| 1    | All 7 phases in one PR | PR 1      | Mechanical moves, no logic changes, 155 tests pass throughout |

---

## Phase 1a: Fix B1 — Redeclared Types (violation #10)

- [ ] 1.1 Remove `OrderEntity` and `OrderLineItemEntity` interface declarations from `modules/orders/application/create-order-use-case.ts`
- [ ] 1.2 Add import `{ OrderEntity, OrderLineItemEntity } from '../domain/order-repository'` to `create-order-use-case.ts`
- [ ] 1.3 Run `npx vitest run` — all 155 tests pass

**Files**: `modules/orders/application/create-order-use-case.ts` (modify)
**Complexity**: S

---

## Phase 1b: Container → composition-root/

- [ ] 1.4 Create `composition-root/` directory
- [ ] 1.5 Move `shared/kernel/container.ts` → `composition-root/container.ts`
- [ ] 1.6 Update all importers of `@/shared/kernel/container` to `@/composition-root/container` (global find-replace)
- [ ] 1.7 Verify `shared/kernel/container.ts` no longer exists
- [ ] 1.8 Run `npx vitest run` — all 155 tests pass

**Files**: `composition-root/container.ts` (create), `shared/kernel/container.ts` (delete), ~15 import sites (modify)
**Complexity**: M

---

## Phase 1c: Delete Roles Re-export

- [ ] 1.9 Update `shared/infrastructure/prisma-user-lookup.ts` import: `@/shared/kernel/roles` (was `@/shared/infrastructure/roles`)
- [ ] 1.10 Update `tests/doubles/memory-user-lookup.ts` import: `@/shared/kernel/roles` (was `@/shared/infrastructure/roles`)
- [ ] 1.11 Delete `shared/infrastructure/roles.ts`
- [ ] 1.12 Run `npx vitest run` — all 155 tests pass

**Files**: `shared/infrastructure/prisma-user-lookup.ts` (modify), `tests/doubles/memory-user-lookup.ts` (modify), `shared/infrastructure/roles.ts` (delete)
**Complexity**: S

---

## Phase 1d: Extract authOptions

- [ ] 1.13 Create `shared/infrastructure/auth-options.ts` with `authOptions` definition (moved from `app/api/auth/[...nextauth]/route.ts`)
- [ ] 1.14 Update `app/api/auth/[...nextauth]/route.ts` to re-export from `@/shared/infrastructure/auth-options`
- [ ] 1.15 Update `app/[locale]/layout.tsx` to import `authOptions` from `@/shared/infrastructure/auth-options`
- [ ] 1.16 Run `npx vitest run` — all 155 tests pass

**Files**: `shared/infrastructure/auth-options.ts` (create), `app/api/auth/[...nextauth]/route.ts` (modify), `app/[locale]/layout.tsx` (modify)
**Complexity**: S

---

## Phase 2: events/ Module

- [ ] 2.1 Create `events/domain/event-registry.ts` — copy `GlobalEvents` + `GlobalEventName` from `shared/events/index.ts` (pure, zero imports)
- [ ] 2.2 Create `events/domain/event-bus-port.ts` — copy `EventBusPort`, `EventHandler`, `EventBus` class, `eventBus` singleton from `shared/kernel/event-bus.ts`
- [ ] 2.3 Update 13 files importing `GlobalEvents` from `@/shared/events` → `@/events/domain/event-registry`
- [ ] 2.4 Update 5 files importing from `@/shared/kernel/event-bus` → `@/events/domain/event-bus-port`
- [ ] 2.5 Update `composition-root/container.ts` to import `EventBusPort` and `eventBus` from `@/events/domain/event-bus-port`
- [ ] 2.6 Delete `shared/events/index.ts`
- [ ] 2.7 Delete `shared/kernel/event-bus.ts`
- [ ] 2.8 Run `npx vitest run` — all 155 tests pass

**Files**: `events/domain/event-registry.ts` (create), `events/domain/event-bus-port.ts` (create), 13 files (modify), 5 files (modify), `shared/events/index.ts` (delete), `shared/kernel/event-bus.ts` (delete)
**Complexity**: M

---

## Phase 3: Email → Own Module

- [ ] 3.1 Create `email/domain/email-sender.ts` — move `EmailSender` interface from `shared/kernel/email-sender.ts`
- [ ] 3.2 Create `email/domain/email-queue-repository.ts` — move `EmailQueueRepository` interface from `shared/kernel/email-queue-repository.ts`
- [ ] 3.3 Create `email/infrastructure/brevo-email-sender.ts` — move from `shared/infrastructure/brevo-email-sender.ts`, update import to `@/email/domain/email-sender`
- [ ] 3.4 Create `email/infrastructure/console-email-sender.ts` — move from `shared/infrastructure/console-email-sender.ts`, update import to `@/email/domain/email-sender`
- [ ] 3.5 Create `email/infrastructure/prisma-email-queue-repository.ts` — move from `shared/infrastructure/prisma-email-queue-repository.ts`, update import to `@/email/domain/email-queue-repository`
- [ ] 3.6 Create `email/infrastructure/brevo-client.ts` — extract `brevoClient`, `FROM_EMAIL`, `FROM_NAME` from `shared/infrastructure/email.ts`
- [ ] 3.7 Update `email/infrastructure/brevo-email-sender.ts` to import SDK from `./brevo-client` instead of lazy `require('./email')`
- [ ] 3.8 Update `composition-root/container.ts` — all email imports from `@/email/domain/...` and `@/email/infrastructure/...`
- [ ] 3.9 Update `workers/email-worker.ts` — email imports from `@/email/...` paths
- [ ] 3.10 Update test doubles: `tests/doubles/memory-email-queue-repository.ts` import path
- [ ] 3.11 Delete `shared/kernel/email-sender.ts`, `shared/kernel/email-queue-repository.ts`
- [ ] 3.12 Delete `shared/infrastructure/brevo-email-sender.ts`, `shared/infrastructure/console-email-sender.ts`, `shared/infrastructure/prisma-email-queue-repository.ts`, `shared/infrastructure/email.ts`
- [ ] 3.13 Run `npx vitest run` — all 155 tests pass

**Files**: 3 domain + 4 infrastructure (create), ~10 import sites (modify), 6 files (delete)
**Complexity**: M

---

## Phase 4: TransactionalOrderPort + Email Worker Cleanup

- [ ] 4.1 Create `modules/orders/domain/transactional-order-port.ts` with `TransactionalOrderPort` interface (extracted from `transactional-order-service.ts`)
- [ ] 4.2 Update `modules/orders/infrastructure/transactional-order-service.ts` to implement `TransactionalOrderPort` from `../domain/transactional-order-port`
- [ ] 4.3 Update `modules/orders/application/mark-as-paid-use-case.ts` — import port from `../domain/transactional-order-port`
- [ ] 4.4 Update `modules/orders/application/assign-to-production-use-case.ts` — import port from `../domain/transactional-order-port`
- [ ] 4.5 Add 4 worker methods to `email/domain/email-queue-repository.ts`: `claimPending`, `markSent`, `markFailed`, `reschedule`
- [ ] 4.6 Add `EmailQueueWorkerEntry` type extending `EmailQueueEntry` in `email/domain/email-queue-repository.ts`
- [ ] 4.7 Implement 4 worker methods in `email/infrastructure/prisma-email-queue-repository.ts`
- [ ] 4.8 Refactor `workers/email-worker.ts` to use `container.getEmailQueueRepository()` instead of direct `prisma.*` calls
- [ ] 4.9 Update `tests/doubles/memory-email-queue-repository.ts` to implement the 4 new methods
- [ ] 4.10 Run `npx vitest run` — all 155 tests pass

**Files**: `modules/orders/domain/transactional-order-port.ts` (create), 4 files (modify), `email/domain/email-queue-repository.ts` (modify), `email/infrastructure/prisma-email-queue-repository.ts` (modify), `workers/email-worker.ts` (modify), `tests/doubles/memory-email-queue-repository.ts` (modify)
**Complexity**: M

---

## Phase 5: Auth Adapters → modules/auth/

- [ ] 5.1 Create `auth/domain/rate-limiter.ts` — move `RateLimiter` from `shared/kernel/rate-limiter.ts`
- [ ] 5.2 Create `auth/domain/session.ts` — move `SessionPort` from `shared/kernel/session.ts`
- [ ] 5.3 Create `auth/domain/secrets.ts` — move `SecretsPort` from `shared/kernel/secrets.ts`
- [ ] 5.4 Create `auth/domain/user-lookup.ts` — move `UserLookupPort` from `shared/kernel/user-lookup.ts`
- [ ] 5.5 Create `auth/domain/roles.ts` — move `ROLES`, `Role` from `shared/kernel/roles.ts`
- [ ] 5.6 Create `auth/infrastructure/prisma-rate-limiter.ts` — move from `shared/infrastructure/prisma-rate-limiter.ts`
- [ ] 5.7 Create `auth/infrastructure/nextauth-session.ts` — move from `shared/infrastructure/nextauth-session.ts`
- [ ] 5.8 Create `auth/infrastructure/process-env-secrets.ts` — move from `shared/infrastructure/process-env-secrets.ts`
- [ ] 5.9 Create `auth/infrastructure/prisma-user-lookup.ts` — move from `shared/infrastructure/prisma-user-lookup.ts`
- [ ] 5.10 Create `auth/infrastructure/authorization.ts` — move from `shared/infrastructure/authorization.ts`
- [ ] 5.11 Update `composition-root/container.ts` — all auth imports from `@/auth/domain/...` and `@/auth/infrastructure/...`
- [ ] 5.12 Update ~25 import sites across app/, modules/, tests/ for new auth paths
- [ ] 5.13 Delete `shared/kernel/rate-limiter.ts`, `session.ts`, `secrets.ts`, `user-lookup.ts`, `roles.ts`
- [ ] 5.14 Delete `shared/infrastructure/prisma-rate-limiter.ts`, `nextauth-session.ts`, `process-env-secrets.ts`, `prisma-user-lookup.ts`, `authorization.ts`
- [ ] 5.15 Verify `shared/kernel/` contains only `app-error.ts` + `outbox-repository.ts`
- [ ] 5.16 Run `npx vitest run` — all 155 tests pass

**Files**: 5 domain + 5 infrastructure (create), ~25 import sites (modify), 10 files (delete)
**Complexity**: L

---

## Phase 6: Password-Hasher → users/

- [ ] 6.1 Create `modules/users/domain/password-hasher.ts` — move `PasswordHasher` from `shared/kernel/password-hasher.ts`
- [ ] 6.2 Create `modules/users/infrastructure/bcrypt-password-hasher.ts` — move `hashPassword`, `verifyPassword` from `shared/infrastructure/password-hasher.ts`
- [ ] 6.3 Update `composition-root/container.ts` — import from `@/modules/users/domain/password-hasher` and `@/modules/users/infrastructure/bcrypt-password-hasher`
- [ ] 6.4 Update `tests/doubles/memory-password-hasher.ts` — import from `@/modules/users/domain/password-hasher`
- [ ] 6.5 Update `tests/unit/register-user-bcrypt.test.ts` — import from `@/modules/users/infrastructure/bcrypt-password-hasher`
- [ ] 6.6 Delete `shared/kernel/password-hasher.ts` and `shared/infrastructure/password-hasher.ts`
- [ ] 6.7 Run `npx vitest run` — all 155 tests pass

**Files**: 2 files (create), 3 files (modify), 2 files (delete)
**Complexity**: S

---

## Phase 7: Utility Relocation + Cleanup

- [ ] 7.1 Create `shared/kernel/escape-html.ts` — move `escapeHtml` from `shared/infrastructure/email.ts` (already deleted in Phase 3; extract before delete or recreate)
- [ ] 7.2 Create `shared/kernel/config.ts` — move `getBaseUrl` + `APP_BASE_URL` from `shared/infrastructure/url.ts`
- [ ] 7.3 Create `shared/presentation/error-handler.ts` — move `handleApiError` from `shared/infrastructure/error-handler.ts`
- [ ] 7.4 Move `shared/i18n/get-dictionary.test.ts` → `tests/unit/get-dictionary.test.ts`
- [ ] 7.5 Move `shared/infrastructure/outbox-worker.ts` → `workers/outbox-worker.ts`
- [ ] 7.6 Update `app/[locale]/layout.tsx` — import outbox worker from `@/workers/outbox-worker`
- [ ] 7.7 Move schemas: `shared/validation/auth-schemas.ts` → `modules/auth/presentation/schemas/auth-schemas.ts`
- [ ] 7.8 Move schemas: `shared/validation/order-schemas.ts` → `modules/orders/presentation/schemas/order-schemas.ts`
- [ ] 7.9 Update all importers of moved schemas, utilities, and error handler
- [ ] 7.10 Delete `shared/infrastructure/url.ts`, `shared/infrastructure/error-handler.ts`, `shared/validation/` directory
- [ ] 7.11 Run `npx vitest run` — all 155 tests pass

**Files**: 4 files (create), ~10 import sites (modify), 4+ files (delete)
**Complexity**: M

---

## Final Verification

- [ ] 7.12 Run full test suite: `npx vitest run` — all 155 tests pass
- [ ] 7.13 Verify `shared/kernel/` contains only `app-error.ts` + `outbox-repository.ts` + `escape-html.ts` + `config.ts`
- [ ] 7.14 Verify zero `prisma.*` imports in `app/` directory
- [ ] 7.15 Verify zero `@/shared/kernel/container` references
- [ ] 7.16 Verify zero `@/shared/events` references
- [ ] 7.17 Verify `workers/` contains both `email-worker.ts` and `outbox-worker.ts`

---

## Cross-Front Constraints Checklist

| #   | Constraint                                                               | Verified By        |
| --- | ------------------------------------------------------------------------ | ------------------ |
| C1  | All 155 tests pass unchanged                                             | Task 7.12          |
| C2  | Zero `prisma.*` in `app/`                                                | Task 7.14          |
| C3  | `shared/kernel/` = app-error + outbox-repository (+ escape-html, config) | Task 7.13          |
| C4  | Zero `../infrastructure/` in `modules/*/application/`                    | Task 1.1, 4.3, 4.4 |
| C5  | `workers/email-worker.ts` zero `prisma.*`                                | Task 4.8           |
| C6  | No DB migrations, no API changes, no env changes                         | All phases         |
| C7  | Container auto-initializing preserved                                    | Task 1.5           |
| C8  | authOptions re-export from route.ts                                      | Task 1.14          |
