# Architecture

# Overview
Modular monolith system in Next.js with decoupling through internal events.

---

# Global Structure

```plaintext
/app                 ← Next.js routes (orchestration only, no business logic)
/modules             ← domain modules, independent of each other
  /orders
  /payments
  /products
  /users
  /auth
  /sellers
  /uploads
  /ai
  /tickets
  /roles
/shared
  /kernel            ← pure ports, errors, event bus, container (NO prisma, NO SDKs)
  /infrastructure    ← Prisma adapters, concrete workers, Brevo/email, hasher
  /events            ← global event registry (GlobalEvents)
  /i18n              ← translations
  /presentation      ← shared UI components
  /validation        ← Zod schemas
/tests
  /doubles           ← in-memory test doubles (only test code imports from here)
  /unit              ← unit tests
  /e2e               ← end-to-end tests
  /ux                ← UX tests
/workers             ← background processes (email-worker, etc.)
/prisma              ← schema, migrations, seed
```

# Module Rules

Each module is independent and contains:
- **domain**: Pure business logic. No external dependencies.
- **application**: Use cases. Depend only on domain + kernel ports.
- **infrastructure**: Adapters that fulfil the module's ports (Prisma, etc.).
- **presentation**: Next.js routes / UI scoped to the module.

# Cross-Module Rules
- **No direct cross-module imports.** A module depends on another only through
  domain ports it defines itself; the adapter in `infrastructure` is the only
  place that touches the foreign module.
- Communication is event-driven (the in-memory `eventBus` in `shared/kernel`).
- The global event registry in `shared/events` is the single source of truth
  for event names.

# Shared Layer Rules

## `shared/kernel` — the pure core
Must be dependency-free except for type-only imports. It contains:
- **Ports**: `OutboxRepository`, `EmailSender`, etc. — interfaces only.
- **Errors**: `AppError` and its subclasses.
- **Event bus**: in-process pub/sub.
- **Composition root**: `container.ts` (the one place that knows about infra).

## `shared/infrastructure` — concrete implementations
- Depends on Prisma, NextAuth, Brevo, bcrypt, env vars.
- Contains the `Prisma*Repository` adapters, the `OutboxWorker`, `OutboxService`,
  `password-hasher`, `rate-limiter`, `authorization`, `email`, `url`, and the
  email sender adapters.
- **Production code outside `shared/infrastructure` MUST NOT import Prisma
  directly** — go through a port and let `container.ts` wire the implementation.

## `tests/doubles` — test-only stubs
- In-memory implementations of ports for fast, isolated unit tests.
- **No production code may import from this folder.** If it does, that's a
  layering violation.

# Transactional Outbox Pattern
All domain events must be persisted in the same transaction as the business
change before being published. The `OutboxRepository` port and the
`OutboxWorker` background process implement this pattern.

# Communication
- Mandatory internal event bus (in-memory, swap-in-ready).
- No direct cross-module calls.
- **Reliability**: Use the Outbox Pattern to ensure at-least-once delivery
  of events.
