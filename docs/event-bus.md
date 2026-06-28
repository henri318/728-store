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
- ProductCustomizationCreated
- CartCreated
- CartItemAdded
- CartItemUpdated
- CartItemRemoved
- CartCheckedOut
- GuestCartMigrated

# CartCheckedOut Flow

1. User confirms checkout → `CheckoutCart.confirm()` runs.
2. In a single atomic transaction:
   - Cart status transitions from ACTIVE → CHECKED_OUT.
   - `CART_CHECKED_OUT` event is written to the Outbox.
3. OutboxWorker publishes `CART_CHECKED_OUT` to the event bus.
4. `HandleCartCheckedOut` (Orders module) receives the event:
   - Groups items by `sellerId`.
   - Preserves `customizationIdList` and frozen customization snapshots.
   - Creates one Order per seller with matching OrderLineItems.
   - Emits `OrderCreated` per order (in the same transaction).
   - Deduplicates by `cartId` for idempotency.

# Execution Flow

1. Emit event.
2. Resolve handlers.
3. Execute side effects.
