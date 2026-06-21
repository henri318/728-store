# Exploration: shared/events → events/ module + shared/kernel/ port relocation

## Current State

### shared/events/index.ts

Contains 4 exports in a single file:

- `GlobalEvents` — event name registry (constant object)
- `GlobalEventName` — derived type from GlobalEvents values
- `emitEvent` — helper that resolves bus from container and calls `emit()`
- `onEvent` — helper that resolves bus from container and calls `on()`

**Critical finding:** `emitEvent` and `onEvent` are NEVER imported by any file. Only `GlobalEvents` (and implicitly `GlobalEventName`) are used. The helpers are dead code.

### shared/kernel/ ports

12 files total. 9 are port interfaces, 2 are cross-cutting domain types, 1 is the container.

---

## Task 1: shared/events → events/ module

### Import Map — `shared/events`

| File                                                               | Imports        | Layer      |
| ------------------------------------------------------------------ | -------------- | ---------- |
| `modules/users/application/register-user-use-case.ts`              | `GlobalEvents` | production |
| `modules/orders/application/create-order-use-case.ts`              | `GlobalEvents` | production |
| `modules/orders/application/mark-as-paid-use-case.ts`              | `GlobalEvents` | production |
| `modules/orders/application/assign-to-production-use-case.ts`      | `GlobalEvents` | production |
| `tests/unit/transactional-order-service.test.ts`                   | `GlobalEvents` | test       |
| `tests/unit/register-user-bcrypt.test.ts`                          | `GlobalEvents` | test       |
| `tests/unit/outbox-service.test.ts`                                | `GlobalEvents` | test       |
| `modules/users/application/register-user-use-case.test.ts`         | `GlobalEvents` | test       |
| `modules/users/application/memory-user-repository.test.ts`         | `GlobalEvents` | test       |
| `modules/orders/application/orders.integration.test.ts`            | `GlobalEvents` | test       |
| `modules/orders/application/create-order-use-case.test.ts`         | `GlobalEvents` | test       |
| `modules/orders/application/mark-as-paid-use-case.test.ts`         | `GlobalEvents` | test       |
| `modules/orders/application/assign-to-production-use-case.test.ts` | `GlobalEvents` | test       |

**Total: 13 files** (4 production, 9 test). Zero workers import from shared/events.

### Proposed events/ module structure

```
events/
  domain/
    event-registry.ts    ← GlobalEvents + GlobalEventName (pure, no deps)
  application/
    emit-event.ts        ← use case: emit via bus port (accepts EventBusPort param)
    on-event.ts          ← use case: subscribe via bus port (accepts EventBusPort param)
  infrastructure/        ← empty for now; concrete bus adapters go here later
```

**Key design decisions:**

1. `event-registry.ts` is pure — zero imports, just constants + types
2. `emit-event.ts` and `on-event.ts` become proper use cases that接受 `EventBusPort` as a parameter (NOT importing from container). This decouples them from the container.
3. The `EventBusPort` type stays in `shared/kernel/event-bus.ts` for now (or moves to `events/domain/event-bus-port.ts` — see Task 2)

### New import paths

| Old import        | New import                       |
| ----------------- | -------------------------------- |
| `@/shared/events` | `@/events/domain/event-registry` |

All 13 files change from `import { GlobalEvents } from '@/shared/events'` to `import { GlobalEvents } from '@/events/domain/event-registry'`.

---

## Task 2: Move ports from shared/kernel/

### Port-by-port analysis

#### 1. email-sender.ts

- **Who imports it:** `shared/infrastructure/brevo-email-sender.ts`, `shared/infrastructure/console-email-sender.ts`, `shared/kernel/container.ts`, `workers/email-worker.ts` (via container)
- **Who implements it:** BrevoEmailSender, ConsoleEmailSender
- **Module owner:** Cross-cutting — used by email worker only, but the port is generic
- **Recommendation:** **Stay in shared/kernel/**. Email is a cross-cutting infrastructure concern. The email worker is the only consumer, but the port is generic enough to stay shared.
- **Risk:** LOW — no change needed

#### 2. outbox-repository.ts

- **Who imports it:** `modules/users/application/register-user-use-case.ts`, `modules/orders/application/create-order-use-case.ts`, `modules/orders/application/mark-as-paid-use-case.ts`, `modules/orders/application/assign-to-production-use-case.ts`, `modules/orders/infrastructure/transactional-order-service.ts`, `shared/infrastructure/outbox-service.ts`, `shared/infrastructure/prisma-outbox-repository.ts`, `shared/kernel/container.ts`, `tests/doubles/memory-outbox-repository.ts`, `tests/unit/outbox-service.test.ts`
- **Who implements it:** PrismaOutboxRepository, MemoryOutboxRepository
- **Module owner:** Cross-cutting — used by both users and orders modules
- **Recommendation:** **Stay in shared/kernel/**. The outbox pattern is a cross-cutting infrastructure concern used by multiple modules.
- **Risk:** LOW — no change needed

#### 3. password-hasher.ts

- **Who imports it:** `modules/users/application/register-user-use-case.ts`, `shared/kernel/container.ts`, `tests/doubles/memory-password-hasher.ts`, `tests/unit/register-user-bcrypt.test.ts`
- **Who implements it:** bcrypt adapter (shared/infrastructure/password-hasher.ts), MemoryPasswordHasher
- **Module owner:** **users/** — only the users module uses password hashing
- **Recommendation:** **Move to `modules/users/domain/password-hasher.ts`**. This is a users-only concern.
- **Files to update:** 4 files change import path
- **Risk:** MEDIUM — the container imports it, and the container is the composition root. The container would import from `@/modules/users/domain/password-hasher` instead of `./password-hasher`. This is acceptable since the container already imports from modules (UserRepository, OrderRepository, etc.).

#### 4. rate-limiter.ts

- **Who imports it:** `shared/kernel/container.ts`, `shared/infrastructure/prisma-rate-limiter.ts`, `tests/doubles/memory-rate-limiter.ts`, `tests/unit/container.test.ts`
- **Who implements it:** PrismaRateLimiter, MemoryRateLimiter
- **Module owner:** Cross-cutting — used by auth/login flow, but the port is generic
- **Recommendation:** **Stay in shared/kernel/**. Rate limiting is a cross-cutting infrastructure concern. It's used by auth but the port is generic enough to stay shared.
- **Risk:** LOW — no change needed

#### 5. session.ts

- **Who imports it:** `shared/infrastructure/nextauth-session.ts`, `shared/infrastructure/authorization.ts`, `shared/kernel/container.ts`, `tests/doubles/memory-session.ts`
- **Who implements it:** NextAuthSessionAdapter, MemorySession
- **Module owner:** Cross-cutting — used by authorization (shared/infrastructure) and auth routes
- **Recommendation:** **Stay in shared/kernel/**. Session is a cross-cutting infrastructure concern used by authorization middleware and auth routes.
- **Risk:** LOW — no change needed

#### 6. secrets.ts

- **Who imports it:** `shared/infrastructure/process-env-secrets.ts`, `shared/kernel/container.ts`, `app/api/auth/signup/route.ts` (via container), `app/api/auth/verify-email/route.ts` (via container), `app/api/auth/resend-verification/route.ts` (via container)
- **Who implements it:** ProcessEnvSecrets
- **Module owner:** Cross-cutting — used by auth routes for JWT signing
- **Recommendation:** **Stay in shared/kernel/**. Secrets is a cross-cutting infrastructure concern.
- **Risk:** LOW — no change needed

#### 7. event-bus.ts

- **Who imports it:** `shared/infrastructure/outbox-service.ts`, `shared/kernel/container.ts`, `tests/unit/event-bus-port.test.ts`, `tests/unit/outbox-service.test.ts`, `tests/unit/container.test.ts`
- **Who implements it:** EventBus (in-memory, same file)
- **Module owner:** **events/** — this IS the events module's core port
- **Recommendation:** **Move to `events/domain/event-bus-port.ts`**. The port belongs in the events module. The in-memory implementation (EventBus class) stays in the same file or moves to `events/infrastructure/in-memory-event-bus.ts`.
- **Files to update:** 5 files change import path
- **Risk:** MEDIUM — the container imports it, and `shared/events/index.ts` also imports from container. After the move, the container would import from `@/events/domain/event-bus-port` instead of `./event-bus`. The `eventBus` singleton instance could stay in `events/infrastructure/` or be re-exported from the port file.

#### 8. app-error.ts — STAYS (cross-cutting) ✅

#### 9. roles.ts — STAYS (cross-cutting) ✅

#### 10. user-lookup.ts

- **Who imports it:** `shared/infrastructure/prisma-user-lookup.ts`, `shared/infrastructure/authorization.ts`, `shared/kernel/container.ts`, `tests/doubles/memory-user-lookup.ts`
- **Who implements it:** PrismaUserLookup, MemoryUserLookup
- **Module owner:** Cross-cutting — used by authorization middleware (shared/infrastructure)
- **Recommendation:** **Stay in shared/kernel/**. UserLookup is used by authorization, which is a cross-cutting infrastructure concern. Moving it to users/ would create a dependency from shared/infrastructure → modules/users/domain, which breaks the layering.
- **Risk:** LOW — no change needed

#### 11. email-queue-repository.ts

- **Who imports it:** `shared/infrastructure/prisma-email-queue-repository.ts`, `shared/kernel/container.ts`, `app/api/auth/signup/route.ts` (via container), `app/api/auth/resend-verification/route.ts` (via container), `workers/email-worker.ts` (via container), `tests/doubles/memory-email-queue-repository.ts`
- **Who implements it:** PrismaEmailQueueRepository, MemoryEmailQueueRepository
- **Module owner:** Cross-cutting — used by auth routes, email worker
- **Recommendation:** **Stay in shared/kernel/**. Email queue is a cross-cutting infrastructure concern.
- **Risk:** LOW — no change needed

---

## Summary: What Actually Moves

### Moves that make sense:

1. **`shared/events/index.ts` → `events/domain/event-registry.ts`** — The event registry is domain-level and belongs in an events module.
2. **`shared/kernel/event-bus.ts` → `events/domain/event-bus-port.ts`** — The EventBusPort IS the events module's core port.
3. **`shared/kernel/password-hasher.ts` → `modules/users/domain/password-hasher.ts`** — Only used by users module.

### Stays in shared/kernel/ (cross-cutting):

- `email-sender.ts` — cross-cutting infrastructure
- `outbox-repository.ts` — cross-cutting infrastructure (used by multiple modules)
- `rate-limiter.ts` — cross-cutting infrastructure
- `session.ts` — cross-cutting infrastructure
- `secrets.ts` — cross-cutting infrastructure
- `app-error.ts` — cross-cutting domain
- `roles.ts` — cross-cutting domain
- `user-lookup.ts` — cross-cutting (authorization depends on it)
- `email-queue-repository.ts` — cross-cutting infrastructure

---

## Dependency Order

### Phase 1: events/ module (no dependencies on other moves)

1. Create `events/domain/event-registry.ts` (copy from `shared/events/index.ts`, remove container import)
2. Create `events/domain/event-bus-port.ts` (copy from `shared/kernel/event-bus.ts`)
3. Update `shared/events/index.ts` to re-export from new locations (backward compat shim)
4. Update `shared/kernel/container.ts` to import from new locations
5. Update all 13 files that import from `shared/events`
6. Update 5 files that import from `shared/kernel/event-bus`
7. Remove old files once all imports are updated

### Phase 2: password-hasher move (independent of Phase 1)

1. Create `modules/users/domain/password-hasher.ts` (copy from `shared/kernel/password-hasher.ts`)
2. Update `shared/kernel/container.ts` to import from new location
3. Update 3 files that import from `shared/kernel/password-hasher`
4. Remove old file

### Phase 3: Cleanup

1. Remove `shared/events/index.ts` (replaced by `events/domain/event-registry.ts`)
2. Remove `shared/kernel/event-bus.ts` (replaced by `events/domain/event-bus-port.ts`)
3. Remove `shared/kernel/password-hasher.ts` (replaced by `modules/users/domain/password-hasher.ts`)
4. Update barrel exports if any

---

## Complete File Mapping

### Old → New locations:

| Old Path                           | New Path                                  | Importers to Update |
| ---------------------------------- | ----------------------------------------- | ------------------- |
| `shared/events/index.ts`           | `events/domain/event-registry.ts`         | 13 files            |
| `shared/kernel/event-bus.ts`       | `events/domain/event-bus-port.ts`         | 5 files             |
| `shared/kernel/password-hasher.ts` | `modules/users/domain/password-hasher.ts` | 3 files             |

### Import chain updates:

**For event-registry.ts (13 files):**

- `modules/users/application/register-user-use-case.ts`
- `modules/orders/application/create-order-use-case.ts`
- `modules/orders/application/mark-as-paid-use-case.ts`
- `modules/orders/application/assign-to-production-use-case.ts`
- `tests/unit/transactional-order-service.test.ts`
- `tests/unit/register-user-bcrypt.test.ts`
- `tests/unit/outbox-service.test.ts`
- `modules/users/application/register-user-use-case.test.ts`
- `modules/users/application/memory-user-repository.test.ts`
- `modules/orders/application/orders.integration.test.ts`
- `modules/orders/application/create-order-use-case.test.ts`
- `modules/orders/application/mark-as-paid-use-case.test.ts`
- `modules/orders/application/assign-to-production-use-case.test.ts`

**For event-bus-port.ts (5 files):**

- `shared/infrastructure/outbox-service.ts`
- `shared/kernel/container.ts`
- `tests/unit/event-bus-port.test.ts`
- `tests/unit/outbox-service.test.ts`
- `tests/unit/container.test.ts`

**For password-hasher.ts (3 files):**

- `shared/kernel/container.ts`
- `tests/doubles/memory-password-hasher.ts`
- `tests/unit/register-user-bcrypt.test.ts`

---

## Risk Assessment

### LOW RISK (safe moves):

- **event-registry.ts** — Pure constants, no logic, no dependencies. Mechanical find-and-replace.
- **event-bus-port.ts** — The port is well-defined. The in-memory implementation moves with it. Tests already use the port interface.

### MEDIUM RISK (needs care):

- **password-hasher.ts** — Moving to users/ creates a dependency from container → modules/users/domain. This is acceptable because the container already depends on module repositories. However, if other modules ever need password hashing, this move would need revisiting.

### NO-GO MOVES (would break architecture):

- **outbox-repository.ts** → would force modules to depend on each other
- **session.ts** → authorization depends on it; can't move to auth module without circular deps
- **user-lookup.ts** → authorization depends on it; can't move to users without breaking layering
- **email-sender.ts**, **rate-limiter.ts**, **secrets.ts**, **email-queue-repository.ts** → all cross-cutting infrastructure

---

## Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should tell the user:

1. **`emitEvent` and `onEvent` are dead code** — nobody imports them. They can be deleted or rewritten as proper use cases that accept `EventBusPort` as a parameter.

2. **Only 3 files actually need to move:**
   - `shared/events/index.ts` → `events/domain/event-registry.ts`
   - `shared/kernel/event-bus.ts` → `events/domain/event-bus-port.ts`
   - `shared/kernel/password-hasher.ts` → `modules/users/domain/password-hasher.ts`

3. **9 of 11 kernel ports stay put** — they're cross-cutting infrastructure concerns. Moving them would break the layering, not improve it.

4. **Total files to update: ~21** (13 for event-registry + 5 for event-bus-port + 3 for password-hasher, with container.ts counted once).

5. **Recommended execution order:** events module first (Phase 1), then password-hasher (Phase 2), then cleanup (Phase 3).
