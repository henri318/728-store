# Architecture

# Overview

Modular monolith system in Next.js with decoupling through internal events.

---

# Global Structure

```plaintext
/modules
/modules/customizations
/shared
/app
```

# Module Rules

Each module is independent and contains:

- **domain**: Pure business logic.
- **application**: Use cases.
- **infrastructure**: DB, external APIs.
- **presentation**: Next.js routes / UI.

# Rules

- Importing between modules is prohibited.
- Communication only through events or interfaces.
- Domain does not depend on anything external.
- Infrastructure does not contain business logic.
- **Transactional Outbox Pattern**: All domain events must be persisted in the same transaction as the business change before being published.

# Communication

- Mandatory internal event bus.
- No direct cross-module calls.
- **Reliability**: Use the Outbox Pattern to ensure at-least-once delivery of events.

---

# Presentation Layer

Each module's `presentation/` layer contains:

- **`schemas/`** -- Zod validation schemas for the module's data.
- **`components/`** (optional) -- React components specific to the module's domain.

Module presentation components:

- May import from `shared/ui/` for primitives.
- May import from their own module's `domain/` and `application/` layers.
- Must NOT import from other modules.
- Must NOT contain business logic (delegate to application use cases).

Shared UI components (`shared/ui/`):

- Are domain-agnostic primitives.
- Have ZERO dependencies on any module.
- Are imported via barrel export: `import { Button } from '@/shared/ui'`.

# Cross-Cutting Concerns

| Concern              | Location                                | Purpose                              |
| -------------------- | --------------------------------------- | ------------------------------------ |
| Role-based access    | `shared/authorization/`                 | `assertRole`, `requireAdmin`         |
| Validation helpers   | `shared/validation/`                    | `checkPasswordMatch`                 |
| Presentation helpers | `shared/presentation/`                  | `buildPageUrl`, `resolveStatusLabel` |
| Design system        | `shared/presentation/design-tokens.css` | CSS custom properties                |
| i18n                 | `shared/i18n/`                          | Dictionary context, locale files     |
