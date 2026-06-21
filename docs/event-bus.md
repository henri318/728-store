# Event Bus Design

# Overview

Internal synchronous/asynchronous event bus.

---

# Interface

```ts
emit(event);
on(eventName, handler);
```

# Rules

- Immutable events.
- Decoupled handlers.
- Mandatory idempotency.

# Base Events

- OrderCreated
- PaymentCompleted
- TicketCreated
- MessageAdded
- AISuggestionGenerated

# Execution Flow

1. Emit event.
2. Resolve handlers.
3. Execute side effects.
