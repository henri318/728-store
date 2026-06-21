# Orders Module

## Overview

The Orders module manages the complete lifecycle of customer orders in the e-commerce platform, from creation through payment to production readiness. It implements event-driven architecture using the Outbox pattern for reliable event emission and state transitions.

## Module Responsibilities

- **Order Creation**: Create orders with line items and initial `pending` status
- **Payment Processing**: Listen to `PaymentCompleted` events and transition orders to `paid` status
- **Production Assignment**: Listen to `ProductCustomizationCreated` events and transition orders to `ready-for-production` status
- **Event Emission**: Emit domain events (`ORDER_PAID`, `ORDER_READY_FOR_PRODUCTION`) via transactional outbox
- **State Management**: Enforce valid state transitions and maintain order lifecycle integrity

## Order Status Lifecycle

```
┌─────────────┐    PaymentCompleted    ┌─────────────┐   CustomizationReady   ┌─────────────────────┐
│   PENDING   │ ──────────────────────> │    PAID     │ ──────────────────────> │ READY-FOR-PRODUCTION │
└─────────────┘                        └─────────────┘                        └─────────────────────┘
     │                                     │                                         │
     │                                     │                                         │
     v                                     v                                         v
┌─────────────┐                       ┌─────────────┐                         ┌─────────────┐
│ CANCELLED   │                       │ CANCELLED   │                         │  COMPLETED  │
└─────────────┘                       └─────────────┘                         └─────────────┘
```

### State Transition Rules

| From Status | To Status              | Trigger Event                 | Validation Rules                             |
| ----------- | ---------------------- | ----------------------------- | -------------------------------------------- |
| `pending`   | `paid`                 | `PaymentCompleted`            | Order must exist, idempotent if already paid |
| `paid`      | `ready-for-production` | `ProductCustomizationCreated` | All line item customizations must be ready   |
| `*`         | `cancelled`            | User/System request           | Can cancel from any status                   |

## Architecture

The module follows **Hexagonal Architecture** (Ports & Adapters) with clear separation:

```
modules/orders/
├── application/           # Application Layer (Use Cases)
│   ├── create-order-use-case.ts
│   ├── mark-as-paid-use-case.ts
│   ├── assign-to-production-use-case.ts
│   └── *.test.ts
├── domain/               # Domain Layer (Entities & Interfaces)
│   └── order-repository.ts
├── infrastructure/       # Infrastructure Layer (Implementations)
│   ├── prisma-order-repository.ts
│   ├── memory-order-repository.ts
│   └── transactional-order-service.ts
└── module-registrar.ts   # Event listener registration
```

## Use Cases

### 1. CreateOrderUseCase

Creates a new order with `pending` status and emits `ORDER_CREATED` event.

```typescript
const useCase = new CreateOrderUseCase(orderRepository, outboxRepository);
const order = await useCase.execute({
  userId: 'user-123',
  sellerId: 'seller-456',
  lineItems: [
    /* ... */
  ],
});
```

### 2. MarkAsPaidUseCase

Listens to `PaymentCompleted` events and transitions orders from `pending` to `paid`.

**Features:**

- Idempotent: Skips if order already paid
- Validates state: Only accepts `pending` orders
- Emits `ORDER_PAID` event via Outbox pattern
- Transactional: Status update + event emission are atomic

```typescript
const useCase = new MarkAsPaidUseCase(
  orderRepository,
  outboxRepository,
  transactionalService,
);

// Direct invocation
await useCase.execute({
  orderId: 'order-123',
  paymentId: 'pay-456',
  amount: 99.99,
});

// Or via event subscription
MarkAsPaidUseCase.subscribe(eventBus, useCase);
```

### 3. AssignToProductionUseCase

Listens to `ProductCustomizationCreated` events and transitions paid orders to `ready-for-production`.

**Features:**

- Idempotent: Skips if already in production
- Validates state: Only accepts `paid` orders
- Emits `ORDER_READY_FOR_PRODUCTION` event via Outbox pattern
- Transactional: Status update + event emission are atomic

```typescript
const useCase = new AssignToProductionUseCase(
  orderRepository,
  outboxRepository,
  transactionalService,
);

// Direct invocation
await useCase.execute({ orderId: 'order-123', customizationId: 'custom-789' });

// Or via event subscription
AssignToProductionUseCase.subscribe(eventBus, useCase);
```

## Event Integration

### Incoming Events (Listeners)

| Event                         | Source Module         | Handler                     | Description                    |
| ----------------------------- | --------------------- | --------------------------- | ------------------------------ |
| `PaymentCompleted`            | payments              | `MarkAsPaidUseCase`         | Marks order as paid            |
| `ProductCustomizationCreated` | product-customization | `AssignToProductionUseCase` | Triggers production assignment |

### Outgoing Events (Emitted)

| Event                        | Payload                                                   | Trigger            | Consumers                |
| ---------------------------- | --------------------------------------------------------- | ------------------ | ------------------------ |
| `ORDER_CREATED`              | `{ orderId, userId, sellerId, total }`                    | Order creation     | Analytics, Notifications |
| `ORDER_PAID`                 | `{ orderId, userId, paymentId, totalAmount, paidAt }`     | Payment completion | Inventory, Accounting    |
| `ORDER_READY_FOR_PRODUCTION` | `{ orderId, userId, sellerId, customizationId, readyAt }` | Production ready   | Production System        |

## Outbox Pattern Integration

The module uses the **Transactional Outbox Pattern** for reliable event emission:

1. **Atomic Writes**: Order status update and event emission happen in the same database transaction
2. **Background Processing**: `OutboxWorker` processes pending events asynchronously
3. **Failure Recovery**: Failed events are marked for retry, ensuring no event loss
4. **Idempotency**: Duplicate events are handled gracefully

```typescript
// Transactional flow example
await prisma.$transaction(async (tx) => {
  // 1. Update order status
  await tx.order.update({ where: { id: orderId }, data: { status: 'paid' } });

  // 2. Save event to outbox (same transaction)
  await tx.outboxEvent.create({
    data: { eventType: 'order.paid', payload, status: 'PENDING' },
  });
});

// OutboxWorker emits events asynchronously
OutboxWorker.start(5000); // Process every 5 seconds
```

## Repository Interface

```typescript
interface OrderRepository {
  save(order: OrderEntity): Promise<OrderEntity>;
  saveOrderLineItems(
    orderId: string,
    lineItems: OrderLineItemEntity[],
  ): Promise<void>;
  findById(orderId: string): Promise<OrderEntity | null>;
  updateStatus(orderId: string, status: OrderStatus): Promise<void>;
}
```

### Implementations

- **PrismaOrderRepository**: Production implementation using Prisma ORM
- **MemoryOrderRepository**: In-memory implementation for testing
- **TransactionalOrderService**: Wraps repository operations with Prisma transactions

## Testing Strategy

### Unit Tests

Each use case has comprehensive unit tests covering:

- Happy path (successful state transition)
- Error cases (non-existent order, invalid state)
- Idempotency (duplicate event handling)
- Event emission verification

```bash
# Run order module tests
npm test -- modules/orders/application/*.test.ts
```

### Test Coverage

- `mark-as-paid-use-case.test.ts`: 5 tests (pending→paid, not found, idempotency, invalid states)
- `assign-to-production-use-case.test.ts`: 5 tests (paid→production, not found, invalid states, idempotency)

## Configuration

### Environment Variables

| Variable                  | Description                  | Default  |
| ------------------------- | ---------------------------- | -------- |
| `DATABASE_URL`            | PostgreSQL connection string | Required |
| `OUTBOX_PROCESS_INTERVAL` | Outbox worker interval (ms)  | 5000     |

### Module Registration

```typescript
// In your application bootstrap
import { MarkAsPaidUseCase, AssignToProductionUseCase } from './modules/orders';
import { eventBus } from './shared/kernel/event-bus';

// Initialize use cases
const markAsPaid = new MarkAsPaidUseCase(
  orderRepo,
  outboxRepo,
  transactionalService,
);
const assignToProduction = new AssignToProductionUseCase(
  orderRepo,
  outboxRepo,
  transactionalService,
);

// Register event listeners
MarkAsPaidUseCase.subscribe(eventBus, markAsPaid);
AssignToProductionUseCase.subscribe(eventBus, assignToProduction);
```

## Error Handling

### Common Errors

| Error                                  | Cause                                 | Resolution                                   |
| -------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `Order not found`                      | Invalid orderId                       | Verify order exists before invoking use case |
| `Invalid state transition`             | Order not in expected status          | Check current order status                   |
| `Order must be paid before production` | Attempting production without payment | Ensure payment completed first               |

### Monitoring

Errors in event listeners are logged but not re-thrown to prevent breaking the event pipeline:

```typescript
eventBus.on(GlobalEvents.PAYMENT_COMPLETED, async (data) => {
  try {
    await useCase.execute(data);
  } catch (error) {
    console.error('Error processing PaymentCompleted event:', error);
    // Error logged for monitoring, event processing continues
  }
});
```

## Dependencies

- **payments module**: Emits `PaymentCompleted` events
- **product-customization module**: Emits `ProductCustomizationCreated` events
- **shared kernel**: EventBus, OutboxWorker, OutboxRepository
- **Prisma**: Database ORM for persistence

## Future Enhancements

- [ ] Saga orchestration for distributed transaction management
- [ ] Event versioning for backward compatibility
- [ ] CQRS with read models for order queries
- [ ] Event sourcing for complete audit trail
