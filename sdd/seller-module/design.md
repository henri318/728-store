# Design: Seller Module

## Technical Approach

Extend the existing barebones `Seller` Prisma model into a full hexagonal module with domain entity, repository port, use cases, Prisma adapter, and API routes. Follow the same patterns as `users` and `orders` modules: entity as plain interface, repository port in domain, adapter in infrastructure, use cases with constructor DI, and outbox event emission.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| User-Seller link | 1:1 via `userId` FK / Separate mapping table | FK is simpler, mapping table more flexible | FK on Seller (1:1, spec requirement) |
| Status values | Enum type / String with validation | Enum = DB constraint, String = flexibility | String with domain validation (matches User.role pattern) |
| Seller creation | Admin creates User+Seller in one use case / Separate use cases | Atomic = simpler, Separate = more composable | Single `CreateSellerUseCase` with Prisma transaction |
| Public profile | Dedicated use case / Reuse GetSeller with filter | Dedicated = clearer intent, Reuse = less code | Dedicated `GetPublicSellerUseCase` (banned sellers excluded) |
| Event emission | Outbox pattern (existing) / Direct emit | Outbox = reliable, Direct = simpler | Outbox (project standard) |

## Data Flow

```
Admin API                    Seller Self-Service            Public API
    │                              │                           │
    ▼                              ▼                           ▼
CreateSellerUseCase        UpdateSellerProfileUseCase   GetPublicSellerUseCase
    │                              │                           │
    ├─→ UserRepository.save()      ├─→ SellerRepository.update()  ├─→ SellerRepository.findById()
    ├─→ SellerRepository.save()    └─→ OutboxRepository.saveEvent() └─→ (filter banned)
    └─→ OutboxRepository.saveEvent()
```

## File Changes

### New Files

| File | Description |
|------|-------------|
| `modules/sellers/domain/seller.ts` | SellerEntity interface |
| `modules/sellers/domain/seller-repository.ts` | Repository port |
| `modules/sellers/domain/seller-events.ts` | Event name constants |
| `modules/sellers/domain/seller-status.ts` | Status value object + transitions |
| `modules/sellers/application/create-seller.ts` | Admin: create user + seller |
| `modules/sellers/application/list-sellers.ts` | Admin: list with filters |
| `modules/sellers/application/get-seller.ts` | Admin: get by id |
| `modules/sellers/application/update-seller.ts` | Admin + self-service |
| `modules/sellers/application/delete-seller.ts` | Soft delete (admin + self) |
| `modules/sellers/application/change-seller-status.ts` | Admin: activate/suspend/ban |
| `modules/sellers/application/get-public-seller.ts` | Public profile (no banned) |
| `modules/sellers/infrastructure/prisma-seller-repository.ts` | Prisma adapter |
| `app/api/sellers/route.ts` | GET list + POST create |
| `app/api/sellers/[id]/route.ts` | GET + PUT + DELETE |
| `app/api/sellers/[id]/status/route.ts` | PATCH status |
| `app/api/sellers/profile/route.ts` | GET own profile (self-service) |
| `tests/doubles/memory-seller-repository.ts` | Test double |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Extend Seller model: add userId, description, status, updatedAt, deletedAt |
| `prisma/seed.ts` | Create admin user linked to seller |
| `composition-root/container.ts` | Add SellerRepository binding + getter/setter |
| `modules/events/domain/event-registry.ts` | Add seller events |

## Interfaces / Contracts

### SellerEntity (domain)

```typescript
export interface SellerEntity {
  readonly sellerId: SellerId;
  readonly userId: UserId;
  readonly name: string;
  readonly description: string | null;
  readonly status: SellerStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date | null;
}
```

### SellerStatus (value object)

```typescript
export type SellerStatusValue = 'active' | 'suspended' | 'banned';

export const SellerStatusTransitions: Record<SellerStatusValue, SellerStatusValue[]> = {
  active: ['suspended', 'banned'],
  suspended: ['active', 'banned'],
  banned: [], // terminal state
};
```

### SellerRepository (port)

```typescript
export interface SellerRepository {
  save(seller: SellerEntity, tx?: any): Promise<SellerEntity>;
  findById(id: string): Promise<SellerEntity | null>;
  findByUserId(userId: string): Promise<SellerEntity | null>;
  findAll(filters?: { status?: string; search?: string }): Promise<SellerEntity[]>;
  update(seller: SellerEntity, tx?: any): Promise<SellerEntity>;
}
```

### Prisma Schema Extension

```prisma
model Seller {
  id          String    @id @default(cuid())
  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id])
  name        String
  description String?
  status      String    @default("active") // active | suspended | banned
  products    Product[]
  orders      Order[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
}
```

### Events

```typescript
export const SellerEvents = {
  SELLER_CREATED: 'seller.created',
  SELLER_UPDATED: 'seller.updated',
  SELLER_DELETED: 'seller.deleted',
  SELLER_STATUS_CHANGED: 'seller.status-changed',
} as const;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Use cases (all 7) | Memory test doubles for repositories, outbox |
| Unit | Status transitions | Pure function tests for allowed/forbidden transitions |
| Integration | Prisma adapter | Real DB (testcontainers or in-memory SQLite) |
| E2E | API routes | Playwright or HTTP tests against running server |

### Test Doubles

- `MemorySellerRepository` — in-memory array, implements `SellerRepository`
- `MemoryUserRepository` — already exists, reuse for user creation in CreateSellerUseCase
- `MemoryOutboxRepository` — already exists, reuse for event assertions

## Migration / Rollout

1. Prisma migration: extend Seller model with new columns
2. Update seed.ts: create admin user + link to existing seller
3. No feature flags needed — module is new, no existing consumers

## Open Questions

- [ ] Should seller `name` be unique? (Spec doesn't require it, but product listings may benefit)
- [ ] Should banned sellers' products be hidden from public catalog? (Out of scope for this change)
