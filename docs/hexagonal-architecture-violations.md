## Exploration: Hexagonal Architecture Violations — Full Audit

### Current State

The 728-store is a Next.js e-commerce app with a modular hexagonal architecture. Modules live under `modules/`, ports in `shared/kernel/`, adapters in `shared/infrastructure/` and `modules/*/infrastructure/`. The composition root is `shared/kernel/container.ts`.

The architecture is ~80% correct — the kernel has pure ports, modules define their own domain interfaces, and the container wires adapters. But there are 12 specific violations (plus 2 bonus ones found) where layers bleed into each other.

---

### Violation #1 — CRITICAL: Container in kernel imports concrete adapters

**Files:** `shared/kernel/container.ts` (lines 39–51)

**What it does:** The container imports 9 concrete adapter classes directly:

- `BrevoEmailSender` from `shared/infrastructure/`
- `ConsoleEmailSender` from `shared/infrastructure/`
- `PrismaOutboxRepository` from `shared/infrastructure/`
- `PrismaRateLimiter` from `shared/infrastructure/`
- `ProcessEnvSecrets` from `shared/infrastructure/`
- `NextAuthSessionAdapter` from `shared/infrastructure/`
- `PrismaEmailQueueRepository` from `shared/infrastructure/`
- `PrismaUserLookup` from `shared/infrastructure/`
- `hashPassword, verifyPassword` from `shared/infrastructure/password-hasher`

Plus 3 module adapters:

- `PrismaUserRepository` from `modules/users/infrastructure/`
- `PrismaOrderRepository` from `modules/orders/infrastructure/`
- `PrismaProductRepository` from `modules/products/infrastructure/`

**What it SHOULD do:** The kernel should be pure. `container.ts` is the composition root — it MUST know about concrete adapters. The issue is that it lives in `shared/kernel/` instead of a dedicated composition root directory.

**Proposed fix:** Move `container.ts` from `shared/kernel/` to a top-level `composition-root/container.ts` (or `app/composition-root.ts`). The kernel directory becomes purely ports and domain types. The container is the ONLY file that bridges kernel ports → infrastructure adapters.

**Dependencies:** None — this can be done first.

**Files affected:** ~5 (move container, update all imports of `@/shared/kernel/container`)

---

### Violation #2 — CRITICAL: Use cases import infrastructure

**Files:**

- `modules/orders/application/mark-as-paid-use-case.ts` (line 4)
- `modules/orders/application/assign-to-production-use-case.ts` (line 4)

**What they do:** Both import `TransactionalOrderService` from `../infrastructure/transactional-order-service`. This service wraps Prisma transactions to atomically update order status + write outbox events.

**What `TransactionalOrderService` does:** It calls `prisma.$transaction()` directly (line 48 of `transactional-order-service.ts`), updating the order via `tx.order.update()` and delegating to `outboxRepository.saveEvent()` with the transaction client. It exists because the use case needs atomicity between status update and event emission.

**What it SHOULD do:** The use case should depend on a port (e.g., `TransactionalOrderPort`) that promises atomicity, without knowing it's Prisma underneath. The port would be: `updateStatusAndEmit(orderId, status, eventType, payload): Promise<void>`.

**Proposed fix:**

1. Extract `TransactionalOrderPort` interface into `modules/orders/domain/` (or `shared/kernel/` since it wraps both order + outbox).
2. `TransactionalOrderService` already implements this contract — just add `implements TransactionalOrderPort`.
3. Use cases accept the port type, not the concrete class.
4. The container wires the concrete service.

**Dependencies:** Should fix #1 first so the container is in its proper home.

**Files affected:** ~6 (2 use cases, 1 port file, 1 adapter, container, tests)

---

### Violation #3 — CRITICAL: email-worker bypasses ports

**File:** `workers/email-worker.ts`

**What it does:** Directly imports `prisma` from `shared/infrastructure/prisma` and calls `prisma.emailQueue.updateMany()`, `prisma.emailQueue.findMany()`, `prisma.emailQueue.update()` — raw Prisma queries for claim/find/update operations.

**What it SHOULD do:** The `EmailQueueRepository` port already exists (`shared/kernel/email-queue-repository.ts`) but is missing the methods the worker needs: `claimProcessing()`, `findProcessing()`, `markSent()`, `markFailed()`, `reschedule()`.

**Proposed fix:**

1. Extend `EmailQueueRepository` port with: `claimPending(limit)`, `findProcessing(limit)`, `markSent(id)`, `markFailed(id, error, retryCount, scheduledAt)`.
2. Implement these in `PrismaEmailQueueRepository`.
3. Worker imports only `EmailQueueRepository` port + `EmailSender` port from kernel, resolves via container.

**Dependencies:** Should fix #1 first.

**Files affected:** ~4 (port, adapter, worker, container)

---

### Violation #4 — HIGH: Cross-module import

**File:** `modules/orders/infrastructure/product-repository-adapter.ts` (line 1)

**What it does:** Imports `ProductRepository` from `@/modules/products/domain/product-repository` — the products module's port type.

**What it SHOULD do:** This is actually a CORRECT adapter pattern (the comment in the file explains this). The adapter bridges orders' port to products' port. The import is type-only (`import type`). However, the coupling exists: if products changes its port, orders' adapter breaks.

**Proposed fix:** Two options:

1. **Accept as-is** — the adapter is the sanctioned boundary crossing point. Type-only imports have zero runtime cost. The adapter exists precisely to absorb this coupling.
2. **Move products port to shared/kernel** — if `ProductRepository` is a shared contract, it belongs in kernel. But this conflicts with module autonomy.

**Recommendation:** Accept as-is. The adapter is doing its job. Mark as "known coupling point" in docs.

**Dependencies:** None.

**Files affected:** 0 (no change needed)

---

### Violation #5 — HIGH: shared/ as global kernel

**Files:**

- `shared/events/index.ts` — imported by 7 application-layer files + 6 test files
- `shared/validation/auth-schemas.ts` — imported by 3 auth routes
- `shared/validation/order-schemas.ts` — imported by 1 orders route
- `shared/i18n/` — imported by layout.tsx

**What they do:** `shared/events/index.ts` defines `GlobalEvents` constants and `emitEvent`/`onEvent` helpers that resolve the EventBus from the container. All modules import from this single file.

**What it SHOULD do:** In strict hexagonal architecture, each module defines its own events. Cross-module communication happens through the event bus, not shared constants. However, `GlobalEvents` is a pragmatic shared registry — it prevents string typos and provides type safety.

**Proposed fix:** Keep `shared/events/` but reframe it as a "shared kernel" module (which it already is). The issue isn't the location — it's that `emitEvent`/`onEvent` resolve from the container at call time. This is acceptable for a composition root pattern. No change needed for events.

For validation schemas: move `auth-schemas.ts` to `modules/auth/` (or keep in shared if used by multiple modules). Move `order-schemas.ts` to `modules/orders/presentation/`.

**Dependencies:** None.

**Files affected:** ~4 (move 2 schema files, update imports)

---

### Violation #6 — HIGH: Workers in wrong location

**File:** `shared/infrastructure/outbox-worker.ts`

**What it does:** Defines an `OutboxWorker` class that polls the outbox and dispatches events. It's a background entry point (like a cron job) that lives inside `shared/infrastructure/`.

**What it SHOULD do:** Workers are entry points — they should live at the top level alongside `app/` and `workers/`. The outbox worker is already started from `layout.tsx`, making it a side-effect entry point.

**Proposed fix:** Move `outbox-worker.ts` from `shared/infrastructure/` to `workers/outbox-worker.ts` (alongside `email-worker.ts`). The `OutboxService` it wraps stays in `shared/infrastructure/` since it's a reusable service.

**Dependencies:** Must fix #9 first (layout.tsx imports it).

**Files affected:** ~3 (move file, update layout.tsx import, update any other imports)

---

### Violation #7 — MEDIUM: app/ imports infrastructure utilities

**Files:**

- `app/api/auth/signup/route.ts` — imports `handleApiError`, `escapeHtml`, `getBaseUrl`
- `app/api/auth/resend-verification/route.ts` — imports `handleApiError`, `escapeHtml`, `getBaseUrl`
- `app/api/auth/verify-email/route.ts` — imports `handleApiError`
- `app/api/orders/route.ts` — imports `handleApiError`, `requireRole`

**What they do:** API routes import utilities from `shared/infrastructure/`. These are:

- `handleApiError` — error-to-HTTP-response mapper (presentation concern)
- `escapeHtml` — XSS prevention utility (pure function, no infrastructure)
- `getBaseUrl` — env-based URL reader (configuration)
- `requireRole` — authorization middleware (uses kernel ports via container)

**What it SHOULD do:** `app/api/` routes ARE the entry point layer — they're allowed to import from infrastructure. This is the outermost ring of hexagonal architecture. However, some of these are misplaced:

- `escapeHtml` is a pure utility, not infrastructure — belongs in `shared/kernel/` or `shared/presentation/`
- `getBaseUrl` is configuration, not infrastructure — belongs in `shared/kernel/secrets.ts` or a new `shared/kernel/config.ts`
- `handleApiError` is presentation layer — belongs in `shared/presentation/`
- `requireRole` already correctly uses kernel ports via container

**Proposed fix:**

1. Move `escapeHtml` to `shared/kernel/` (pure function, no deps)
2. Move `getBaseUrl` to `shared/kernel/config.ts` or add to `SecretsPort`
3. Move `handleApiError` to `shared/presentation/error-handler.ts`
4. `requireRole` is fine — it's a backward-compat shim over kernel ports

**Dependencies:** None.

**Files affected:** ~7 (3 utility moves, 4 route import updates)

---

### Violation #8 — MEDIUM: app/ imports module adapters

**File:** `app/api/orders/route.ts` (line 3)

**What it does:** Imports `OrderProductRepositoryAdapter` from `@/modules/orders/infrastructure/product-repository-adapter` and instantiates it inline.

**What it SHOULD do:** The adapter should be wired in the container, not instantiated in the route. The route should call `container.getProductRepository()` and get the already-adapted version.

**Proposed fix:** Wire `OrderProductRepositoryAdapter` in the container as the `ProductRepository` binding for the orders context. Or create a dedicated `getOrderProductRepository()` getter. The route just calls the container.

**Dependencies:** Should fix #1 first.

**Files affected:** ~3 (container, route, possibly a new getter)

---

### Violation #9 — MEDIUM: layout.tsx imports infrastructure

**File:** `app/[locale]/layout.tsx` (lines 5, 9–11)

**What it does:** Imports `outboxWorker` from `shared/infrastructure/outbox-worker` and starts it as a side-effect at module load time.

**What it SHOULD do:** Background workers should be started from a dedicated entry point, not from a React layout component. Layout.tsx is a presentation component — it shouldn't own infrastructure lifecycle.

**Proposed fix:** Start the outbox worker from:

1. A `workers/` entry point (like `email-worker.ts`)
2. A Next.js middleware or instrument file
3. A dedicated `start-workers.ts` script imported by the app entry

**Dependencies:** Must fix #6 first (move worker out of shared/infrastructure/).

**Files affected:** ~3 (new entry point, layout.tsx cleanup, worker move)

---

### Violation #10 — LOW: Test doubles in infrastructure

**Files:**

- `modules/users/infrastructure/memory-user-repository.ts`
- `modules/orders/infrastructure/memory-order-repository.ts`
- `modules/products/infrastructure/memory-product-repository.ts`

**What they do:** In-memory test implementations live alongside production adapters in `modules/*/infrastructure/`.

**What it SHOULD do:** Test doubles belong in `tests/doubles/` (which already has 10 doubles). Keeping them in infrastructure pollutes the production module with test code.

**Proposed fix:** Move all 3 memory repositories to `tests/doubles/`. Update test imports.

**Dependencies:** None.

**Files affected:** ~6 (3 moves, 3+ test import updates)

---

### Violation #11 — LOW: Validation outside modules

**Files:**

- `shared/validation/auth-schemas.ts`
- `shared/validation/order-schemas.ts`

**What they do:** Zod schemas for auth and orders live in `shared/validation/`.

**What it SHOULD do:** Schemas are presentation-layer concerns specific to their module. Auth schemas should be in `modules/auth/presentation/` or `app/api/auth/` (since they're only used by API routes). Order schemas should be in `modules/orders/presentation/`.

**Proposed fix:** Move `auth-schemas.ts` to `modules/auth/presentation/auth-schemas.ts`. Move `order-schemas.ts` to `modules/orders/presentation/order-schemas.ts`. Update route imports.

**Dependencies:** None.

**Files affected:** ~5 (2 moves, 3 route import updates)

---

### Violation #12 — LOW: Roles re-export

**File:** `shared/infrastructure/roles.ts`

**What it does:** Re-exports `ROLES` and `Role` from `shared/kernel/roles.ts` for backward compatibility. Only imported by 2 files: `prisma-user-lookup.ts` and `tests/doubles/memory-user-lookup.ts`.

**What it SHOULD do:** All consumers should import from `shared/kernel/roles.ts` directly. The re-export is unnecessary.

**Proposed fix:** Update the 2 import sites to use `@/shared/kernel/roles`, then delete `shared/infrastructure/roles.ts`.

**Dependencies:** None.

**Files affected:** ~3 (2 import updates, 1 file delete)

---

### BONUS Violations Found (not in original list)

**B1: `create-order-use-case.ts` redefines domain types**

File: `modules/orders/application/create-order-use-case.ts` (lines 30–48)

The use case re-declares `OrderLineItemEntity` and `OrderEntity` interfaces that already exist in `modules/orders/domain/order-repository.ts`. This creates type drift — two versions of the same entity.

**Fix:** Import from `../domain/order-repository` instead of redeclaring.

**B2: `app/[locale]/layout.tsx` imports from `app/api/auth/[...nextauth]/route.ts`**

File: `app/[locale]/layout.tsx` (line 2)

Imports `authOptions` from the NextAuth API route. This couples the presentation layer to a specific API route implementation.

**Fix:** Extract `authOptions` to a shared location like `shared/infrastructure/auth-options.ts` or `modules/auth/infrastructure/nextauth-config.ts`.

---

### Dependency Order for Fixing All 12

```
Phase 1 — Foundation (no dependencies):
  #12  Delete roles re-export                    (2 files)
  #10  Move test doubles to tests/doubles/       (6 files)
  #11  Move validation schemas to modules        (5 files)
  B1   Fix redeclared types in create-order-use-case (1 file)
  B2   Extract authOptions                       (3 files)

Phase 2 — Container relocation (depends on nothing, but enables later phases):
  #1   Move container.ts to composition-root/    (5 files)

Phase 3 — Port extraction (depends on #1):
  #2   Extract TransactionalOrderPort            (6 files)
  #3   Extend EmailQueueRepository port + fix worker (4 files)
  #8   Wire OrderProductRepositoryAdapter in container (3 files)

Phase 4 — Utility relocation (independent):
  #5   Move validation schemas (overlaps with #11) (4 files)
  #7   Move escapeHtml, getBaseUrl, handleApiError (7 files)

Phase 5 — Entry point cleanup (depends on #1, #6):
  #6   Move outbox-worker.ts to workers/         (3 files)
  #9   Remove worker start from layout.tsx       (3 files)
```

---

### Additional Findings

**Import health summary:**

- `shared/infrastructure/prisma` is imported by 9 files — all are infrastructure adapters (correct) + 1 worker (violation #3)
- `shared/infrastructure/` utilities are imported by 34 files total — most are tests or entry points (acceptable)
- `shared/events` is imported by 13 files — all are application layer or tests (correct for shared kernel)
- Cross-module imports: only 1 (orders adapter → products domain) — this is the sanctioned adapter pattern

**What's actually CLEAN:**

- Domain layers (`modules/*/domain/`) have ZERO infrastructure imports
- Use cases only import from kernel ports + their own domain (except #2)
- All Prisma imports are confined to `shared/infrastructure/` + `modules/*/infrastructure/` (except #3)
- The event bus + outbox pattern is well-implemented

---

### Ready for Proposal

**Yes** — the codebase is well-understood. All 12 violations are mapped with concrete fixes. The dependency order is clear. The 2 bonus violations are minor but worth including.

**Tell the user:** "I found 2 additional violations beyond your list (redeclared types in create-order-use-case, and authOptions coupling in layout.tsx). The full audit maps 14 violations with a 5-phase fix order. Ready to create the proposal."
