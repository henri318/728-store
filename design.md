# Design: Secure Products, Uploads & Outbox Reliability

## Technical Approach

Three independent priorities, each isolated by module boundary. All changes are backwards-compatible — no schema migrations, no data changes. Route-level enforcement for security; adapter pattern for payments; composition-root wiring for outbox reliability.

---

## P1 — Product Exposure + Upload Ownership

### SEC-01: Audience Derivation in GET /api/products

**Current state (line 30):** `audience = session?.id ? (filter.audience ?? 'seller') : 'public'` — any authenticated user passes `seller` audience, seeing all statuses.

**New logic:**

```
get session role from DB (via UserLookupPort)
if no session → audience='public'
if role === 'CUSTOMER' → audience='public', ignore sellerId param
if role === 'DESIGNER' → audience='seller', sellerId = session's seller account (fetched from SellerRepository.findByUserId), ignore sellerId param
if role === 'ADMIN' → allow passed audience and sellerId from params
```

**File: `src/app/api/products/route.ts`**

| Line | Change                                                           |
| ---- | ---------------------------------------------------------------- |
| 1-9  | Add imports: `UserLookupPort`, `SellerRepository` from container |
| 30   | Replace `audience` derivation with role-based logic below        |
| 36   | Add `sellerId` override for DESIGNER                             |

Implementation: Fetch `user.role` via `container.getUserLookup().findById(session.id)`. For DESIGNER, fetch seller via `container.getSellerRepository().findByUserId(session.id)` and set `filter.sellerId = seller.sellerId.value`. For CUSTOMER, force `audience = 'public'` and clear any `sellerId`.

### SEC-04: Public Product Detail Page

**File: `src/modules/products/domain/product-repository.ts`**

Extend `findById` signature:

```ts
findById(id: string, locale: string, audience?: ProductAudience): Promise<ProductEntity | null>;
```

**File: `src/modules/products/infrastructure/prisma-product-repository.ts`**

In `findById` (line 132-149): when `audience === 'public'`, add `where: { id, status: 'ACTIVE' }`. Otherwise keep `where: { id }`.

**File: `src/modules/products/application/get-product-by-id-use-case.ts`**

Add optional `audience` parameter:

```ts
async execute(id: string, locale: string, audience?: ProductAudience) {
  const product = await this.productRepository.findById(id, locale, audience ?? 'public');
  ...
}
```

**File: `src/app/[locale]/products/[id]/page.tsx`** — No change needed. The page calls `useCase.execute(id, locale)` which defaults to `public` audience via the use case.

### SEC-02: Upload Ownership

Follow the existing `DeleteUploadUseCase` pattern (line 16-26): fetch upload, check `upload.uploadedBy !== userId && !isAdmin`, throw `AppError('Forbidden', 403)`.

**File: `src/modules/uploads/application/generate-read-url-use-case.ts`**

```ts
async execute(id: string, expires?: number, userId?: string, isAdmin?: boolean): Promise<GenerateReadUrlResult> {
  const upload = await this.uploadRepo.findById(id);
  if (!upload) throw new NotFoundError('Upload not found');
  // Ownership check
  if (userId && upload.uploadedBy !== userId && !isAdmin) {
    throw new AppError('Forbidden', 403, 'Forbidden');
  }
  ...
}
```

**File: `src/modules/uploads/application/confirm-upload-use-case.ts`**

```ts
async execute(id: string, userId?: string, isAdmin?: boolean): Promise<ConfirmUploadResult> {
  return this.txRunner.run(async () => {
    const upload = await this.uploadRepo.findById(id);
    if (!upload) throw new NotFoundError('Upload not found');
    // Ownership check
    if (userId && upload.uploadedBy !== userId && !isAdmin) {
      throw new AppError('Forbidden', 403, 'Forbidden');
    }
    ...
  });
}
```

**File: `src/app/api/uploads/[id]/route.ts`** (GET handler, line 12-47)

Pass session context to use case:

```ts
const getUpload = new GetUploadUseCase(uploadRepo);
const upload = await getUpload.execute(id); // GetUploadUseCase has no ownership — it's metadata only
```

Actually, `GetUploadUseCase` is not defined in the imports — the route uses it directly. The ownership check should be inline (matching DELETE pattern):

```ts
const upload = await getUpload.execute(id);
if (upload.uploadedBy !== session.userId && session.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**File: `src/app/api/uploads/[id]/url/route.ts`** (line 34-36)

```ts
const sessionCtx = await getSessionUserContext(); // replace getServerSession
const result = await generateReadUrl.execute(
  id,
  parsed.expires,
  sessionCtx?.userId,
  sessionCtx?.role === 'ADMIN',
);
```

**File: `src/app/api/uploads/[id]/confirm/route.ts`** (line 29-35)

```ts
const sessionCtx = await getSessionUserContext();
const result = await confirmUpload.execute(
  id,
  sessionCtx?.userId,
  sessionCtx?.role === 'ADMIN',
);
```

---

## P2 — Payment Gate

### ConsolePaymentPort

**New file: `src/modules/payments/infrastructure/console-payment-port.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type {
  CheckoutGroupPaymentChargeInput,
  CheckoutGroupPaymentChargeResult,
  CheckoutGroupPaymentPort,
} from '../domain/checkout-group-payment-port';

export class ConsolePaymentPort implements CheckoutGroupPaymentPort {
  async charge(
    input: CheckoutGroupPaymentChargeInput,
  ): Promise<CheckoutGroupPaymentChargeResult> {
    console.log(
      `[ConsolePaymentPort] charge: checkoutGroupId=${input.checkoutGroupId} amount=${input.amount} ${input.currency}`,
    );
    return { paymentId: randomUUID(), status: 'completed' };
  }
}
```

**File: `src/composition-root/container.ts`** — `getCheckoutGroupPaymentPort()` (line 299-302)

```ts
export function getCheckoutGroupPaymentPort(): CheckoutGroupPaymentPort {
  if (!state.checkoutGroupPaymentPort) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[container] No real payment gateway configured. ' +
          'Set up a CheckoutGroupPaymentPort adapter before deploying to production.',
      );
    }
    state.checkoutGroupPaymentPort = new ConsolePaymentPort();
  }
  return state.checkoutGroupPaymentPort as CheckoutGroupPaymentPort;
}
```

Add import: `import { ConsolePaymentPort } from '@/modules/payments/infrastructure/console-payment-port';`

---

## P3 — Outbox Reliability

### ARC-01: Call initContainer() before outbox worker

**File: `src/app/[locale]/layout.tsx`** — lines 27-32

Before:

```ts
if (
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_OUTBOX_WORKER === 'true'
) {
  outboxWorker.start();
}
```

After:

```ts
import { initContainer } from '@/composition-root/container';
// ...
if (
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_OUTBOX_WORKER === 'true'
) {
  initContainer(); // idempotent — safe to call multiple times
  outboxWorker.start();
}
```

### ARC-02: Remove try-catch in subscribers

**File: `src/modules/orders/application/handle-cart-checked-out.ts`** — lines 61-67

```ts
static subscribe(eventBus: EventBusPort, useCase: HandleCartCheckedOut): void {
  eventBus.on(GlobalEvents.CART_CHECKED_OUT, async (data: unknown) => {
    await useCase.execute(data as CartCheckedOutPayload);
  });
}
```

**File: `src/modules/orders/application/mark-as-paid-use-case.ts`** — lines 57-63

```ts
static subscribe(eventBus: EventBusPort, useCase: MarkAsPaidUseCase): void {
  eventBus.on(GlobalEvents.PAYMENT_COMPLETED, async (data: unknown) => {
    await useCase.execute(data as MarkAsPaidDTO);
  });
}
```

**File: `src/modules/email/application/email-event-subscribers.ts`** — lines 42-64

Remove the `try` block, keep only the handler call + drain. The `subscribe` helper function's inner try-catch must be removed:

```ts
function subscribe<T>(
  eventBus: EventBusPort,
  eventName: string,
  label: string,
  handler: (payload: T) => Promise<void>,
  drain?: Pick<EmailQueueDrainService, 'drain'>,
): void {
  eventBus.on(eventName, async (data: unknown) => {
    await handler(data as T);
    if (drain) {
      await drain.drain({ source: 'inline' });
    }
  });
}
```

### ARC-03: Wire MarkAsPaidUseCase in container

**File: `src/composition-root/container.ts`** — after email subscription block (line 206)

```ts
// --- Payment event subscriptions (idempotent for HMR) ---
if (!state.isPaymentEventsSubscribed) {
  const markAsPaid = new MarkAsPaidUseCase(
    state.orderRepository as OrderRepository,
    state.outboxRepository as OutboxRepository,
  );
  MarkAsPaidUseCase.subscribe(state.eventBus as EventBusPort, markAsPaid);
  state.isPaymentEventsSubscribed = true;
}
```

Add import: `import { MarkAsPaidUseCase } from '@/modules/orders/application/mark-as-paid-use-case';`

Add setter: `resetPaymentEventSubscriptions(): void { state.isPaymentEventsSubscribed = false; }`

### ARC-03b: Transactional saveEvent for 5 use cases

Pattern: Wrap the `saveEvent` call inside a `TransactionRunner.run()` block that already contains the business write. Each use case needs `TransactionRunner` injected.

| Use Case               | Has txRunner? | Has outboxRepo? | Change                                                                              |
| ---------------------- | ------------- | --------------- | ----------------------------------------------------------------------------------- |
| `RegisterUserUseCase`  | No            | Yes             | Inject `TransactionRunner`. Wrap `save()` + `saveEvent()` in `txRunner.run()`       |
| `CreateProductUseCase` | No            | Yes (optional)  | Inject `TransactionRunner`. Wrap `save()` + `saveEvent()` in `txRunner.run()`       |
| `UpdateProductUseCase` | No            | Yes (optional)  | Inject `TransactionRunner`. Wrap `update()` + `saveEvent()` in `txRunner.run()`     |
| `CreateSellerUseCase`  | No            | Yes             | Inject `TransactionRunner`. Wrap `save()` + `saveEvent()` in `txRunner.run()`       |
| `AddItemToCart`        | No            | Yes             | Inject `TransactionRunner`. Wrap `save()` + `saveEvent()` calls in `txRunner.run()` |

**Constructor signature changes:**

```ts
// RegisterUserUseCase
constructor(
  private userRepository: UserRepository,
  private outboxRepository: OutboxRepository,
  private passwordHasher: PasswordHasher,
  private transactionRunner: TransactionRunner, // NEW
) {}

// CreateProductUseCase
constructor(
  private readonly productRepository: ProductRepository,
  private readonly outboxRepository?: OutboxRepository,
  private readonly transactionRunner?: TransactionRunner, // NEW
) {}

// UpdateProductUseCase — same pattern
// CreateSellerUseCase — same pattern
// AddItemToCart — same pattern
```

**Caller updates in container.ts and route handlers:** Pass `getTransactionRunner()` as the new argument.

---

## File Changes

| File                                                                  | Action     | Description                                               |
| --------------------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| `src/app/api/products/route.ts`                                       | Modify     | Role-based audience derivation (SEC-01)                   |
| `src/modules/products/domain/product-repository.ts`                   | Modify     | Add `audience?` param to `findById`                       |
| `src/modules/products/infrastructure/prisma-product-repository.ts`    | Modify     | Filter ACTIVE for public audience in `findById`           |
| `src/modules/products/application/get-product-by-id-use-case.ts`      | Modify     | Add `audience` param (SEC-04)                             |
| `src/app/api/uploads/[id]/route.ts`                                   | Modify     | Add ownership check on GET (SEC-02)                       |
| `src/app/api/uploads/[id]/url/route.ts`                               | Modify     | Pass userId/isAdmin to use case (SEC-02)                  |
| `src/app/api/uploads/[id]/confirm/route.ts`                           | Modify     | Pass userId/isAdmin to use case (SEC-02)                  |
| `src/modules/uploads/application/generate-read-url-use-case.ts`       | Modify     | Add ownership check                                       |
| `src/modules/uploads/application/confirm-upload-use-case.ts`          | Modify     | Add ownership check                                       |
| `src/modules/payments/infrastructure/console-payment-port.ts`         | **Create** | Dev/test payment simulator                                |
| `src/composition-root/container.ts`                                   | Modify     | Payment gate + MarkAsPaid subscription + txRunner imports |
| `src/app/[locale]/layout.tsx`                                         | Modify     | Call `initContainer()` before outboxWorker                |
| `src/modules/orders/application/handle-cart-checked-out.ts`           | Modify     | Remove try-catch in subscribe                             |
| `src/modules/orders/application/mark-as-paid-use-case.ts`             | Modify     | Remove try-catch in subscribe                             |
| `src/modules/email/application/email-event-subscribers.ts`            | Modify     | Remove try-catch in subscribe helper                      |
| `src/modules/users/application/use-cases/register-user-use-case.ts`   | Modify     | Transactional saveEvent                                   |
| `src/modules/products/application/create-product-use-case.ts`         | Modify     | Transactional saveEvent                                   |
| `src/modules/products/application/update-product-use-case.ts`         | Modify     | Transactional saveEvent                                   |
| `src/modules/sellers/application/use-cases/create-seller-use-case.ts` | Modify     | Transactional saveEvent                                   |
| `src/modules/cart/application/add-item-to-cart.ts`                    | Modify     | Transactional saveEvent                                   |

---

## Interfaces / Contracts

### ProductRepository.findById — Extended

```ts
findById(id: string, locale: string, audience?: ProductAudience): Promise<ProductEntity | null>;
```

### GenerateReadUrlUseCase.execute — Extended

```ts
execute(id: string, expires?: number, userId?: string, isAdmin?: boolean): Promise<GenerateReadUrlResult>;
```

### ConfirmUploadUseCase.execute — Extended

```ts
execute(id: string, userId?: string, isAdmin?: boolean): Promise<ConfirmUploadResult>;
```

### CheckoutGroupPaymentPort — Unchanged (ConsolePaymentPort implements existing interface)

---

## Testing Strategy

| Layer       | What to Test                              | Approach                                                                       |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Unit        | SEC-01 audience derivation                | Mock UserLookup + SellerRepository; assert audience/sellerId for each role     |
| Unit        | SEC-04 findById with audience             | Mock ProductRepository; assert ACTIVE filter applied for public                |
| Unit        | SEC-02 upload ownership                   | Mock UploadRepository; assert Forbidden for non-owner, allowed for owner/admin |
| Unit        | ConsolePaymentPort.charge                 | Assert returns `{ status: 'completed', paymentId: uuid }`                      |
| Unit        | ARC-02 subscriber re-throw                | Call subscriber with failing handler; assert error propagates (not swallowed)  |
| Unit        | ARC-03b transactional saveEvent           | Mock TransactionRunner; assert saveEvent called within tx callback             |
| Integration | Full GET /api/products flow               | Role-based audience filtering with real DB                                     |
| Integration | Upload ownership end-to-end               | Create upload as user A; attempt GET/url/confirm as user B → 403               |
| E2E         | Product detail page returns 404 for DRAFT | Navigate to DRAFT product slug → not-found state                               |

---

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

---

## Migration / Rollout

No migration required. All changes are code-only:

- Security fixes are additive guards (reject unauthorized, don't change data shape)
- Payment gate throws in production until real adapter is plugged in
- Outbox fixes are composition-root wiring changes

Rollback: revert each priority independently. No cross-dependencies.

---

## Open Questions

- [ ] Should `GetUploadUseCase` (metadata GET) also get ownership check, or is inline check in route sufficient? Design uses inline check to avoid changing the use case interface for a single caller.
- [ ] For ARC-03b, `AddItemToCart` emits two events (CART_CREATED + CART_ITEM_ADDED) — both must be in the same tx. Verify `CartRepository.save()` works within an external `$transaction` client.
