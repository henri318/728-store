# Architecture

# Overview

Modular monolith system in Next.js with decoupling through internal events.

---

# Global Structure

```plaintext
/modules
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
