# Verification Report — Cart Module PR 1 (Foundation)

## Metadata

| Field          | Value                       |
| -------------- | --------------------------- |
| Change         | cart-module                 |
| Phase          | PR 1 of 3 — Foundation      |
| Mode           | interactive                 |
| Strict TDD     | ACTIVE                      |
| Artifact store | engram (project: 728-store) |
| Review budget  | 800 lines                   |

## Completeness Table

| Source         | Artifact                                | Status |
| -------------- | --------------------------------------- | ------ |
| Spec           | `sdd/cart-module/spec` (#288)           | Read   |
| Design         | `sdd/cart-module/design` (#289)         | Read   |
| Tasks          | `sdd/cart-module/tasks` (#290)          | Read   |
| Apply Progress | `sdd/cart-module/apply-progress` (#291) | Read   |

PR 1 scope: Prisma schema + migration, domain value objects, domain entities, domain errors, domain ports, in-memory test double.

## Build / Tests / Coverage Evidence

| Command                                                                                   | Result                        |
| ----------------------------------------------------------------------------------------- | ----------------------------- |
| `npx tsc --noEmit`                                                                        | ✅ No errors                  |
| `npx vitest run tests/unit/modules/cart tests/doubles/memory-cart-repository.ts`          | ✅ 62/62 passed               |
| `npx eslint modules/cart tests/unit/modules/cart tests/doubles/memory-cart-repository.ts` | ✅ No errors/warnings         |
| `npx prisma migrate status`                                                               | ✅ Database schema up to date |

Coverage tool (`@vitest/coverage-v8`) is not installed; per-file coverage analysis was skipped.

## Spec Compliance Matrix

| Requirement                       | Scenario / Rule                                               | Implementation Evidence                                                            | Test Evidence                              | Status                                                             |
| --------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| REQ-CART-001 Cart Entity          | Fields id, userId, status, createdAt, updatedAt, items        | `prisma/schema.prisma` Cart model; `modules/cart/domain/entities/cart.ts`          | `memory-cart-repository.test.ts`           | ✅ PASS                                                            |
| REQ-CART-001                      | User has at most one ACTIVE cart                              | Index `@@index([userId, status])` + `findActiveByUserId`                           | `memory-cart-repository.test.ts` L60-80    | ⚠️ PARTIAL — DB allows duplicates; app must enforce (see Warnings) |
| REQ-CART-001                      | Auto-create on first add                                      | Out of PR 1 scope (use case in PR 2)                                               | —                                          | ⏸️ SKIPPED                                                         |
| REQ-CART-001                      | Reject mutations on checked-out cart                          | Out of PR 1 scope (use case in PR 2)                                               | —                                          | ⏸️ SKIPPED                                                         |
| REQ-CART-002 CartItem Entity      | Fields incl. quantity 1..99, unitPriceSnapshot, customization | `prisma/schema.prisma` CartItem model; `modules/cart/domain/entities/cart-item.ts` | `memory-cart-repository.test.ts`           | ✅ PASS                                                            |
| REQ-CART-002                      | Quantity range 1..99                                          | `modules/cart/domain/value-objects/quantity.ts`                                    | `quantity.test.ts` L18-54                  | ✅ PASS                                                            |
| REQ-CART-002                      | Separate row per customization variant                        | Out of PR 1 scope (use case in PR 2)                                               | —                                          | ⏸️ SKIPPED                                                         |
| REQ-CART-003 CartStatus           | ACTIVE / CHECKED_OUT only                                     | `modules/cart/domain/value-objects/cart-status.ts`                                 | `memory-cart-repository.test.ts` L70-80    | ✅ PASS                                                            |
| REQ-CART-003                      | Transition ACTIVE → CHECKED_OUT via checkout                  | `CartRepository.markCheckedOut` exists                                             | `memory-cart-repository.test.ts` L135-154  | ✅ PASS                                                            |
| REQ-CART-021 PrismaCartRepository | Index `@@index([userId, status])`                             | `prisma/schema.prisma` L208; migration L37                                         | `schema-product-domain.test.ts` (existing) | ✅ PASS                                                            |
| REQ-CART-021                      | Transactions via `prisma.$transaction`                        | Out of PR 1 scope (adapter in PR 2)                                                | —                                          | ⏸️ SKIPPED                                                         |

## Correctness Table

| Area          | Findings                                                                    |
| ------------- | --------------------------------------------------------------------------- |
| Prisma schema | Matches spec: Cart, CartItem, CartStatus enum, indexes, User back-relation. |
| Value objects | `CartId`, `CartItemId`, `Quantity`, `CartStatus` implemented and tested.    |
| Domain errors | All specified error types present and extend `AppError` correctly.          |
| Ports         | `CartRepository`, `ProductRepository`, `ProductSnapshot` defined.           |
| Test double   | `MemoryCartRepository` implements port 1:1 and is fully tested.             |

## Design Coherence Table

| Design Item              | Design Spec                                                  | Implementation                                                                    | Status                                 |
| ------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------- |
| Folder structure         | `modules/cart/domain/...`                                    | Matches                                                                           | ✅                                     |
| CartEntity interface     | id, userId, status, items, createdAt, updatedAt              | Matches                                                                           | ✅                                     |
| CartItemEntity interface | incl. unitPriceSnapshot                                      | Uses `Money` instead of `number`                                                  | ⚠️ Deviation — see Warnings            |
| CartRepository port      | findByUserId, save, markCheckedOut, deleteItem, findItemById | Adds `findById`, `findItemsByCartId`; renames findByUserId → `findActiveByUserId` | ⚠️ Deviation — aligns better with spec |
| ProductRepository port   | findById, findByIds                                          | Matches                                                                           | ✅                                     |
| ProductSnapshot          | id, basePrice, sellerId                                      | Matches                                                                           | ✅                                     |
| MemoryCartRepository     | Mirror production port 1:1                                   | Matches                                                                           | ✅                                     |

## TDD Compliance

| Check                         | Result             | Details                                                                                             |
| ----------------------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| TDD Evidence reported         | ✅ Found           | Apply-progress contains TDD Cycle Evidence table                                                    |
| All tasks have tests          | ✅ 5/5 task groups | Test files exist for CartId, CartItemId, Quantity, errors, MemoryCartRepository                     |
| RED confirmed (tests exist)   | ✅ 5/5             | All listed test files present in repo                                                               |
| GREEN confirmed (tests pass)  | ✅ 62/62           | Executed and passed                                                                                 |
| Triangulation adequate        | ✅                 | Quantity 18 cases, MemoryRepo 16 cases, errors 12 cases, IDs 8 cases each                           |
| Safety Net for modified files | ⚠️ N/A             | Prisma schema modification has no automated safety-net test; new domain files are new, not modified |

**TDD Compliance**: 5/6 checks passed (safety net informational only).

## Test Layer Distribution

| Layer       | Tests  | Files | Tools  |
| ----------- | ------ | ----- | ------ |
| Unit        | 62     | 5     | vitest |
| Integration | 0      | 0     | —      |
| E2E         | 0      | 0     | —      |
| **Total**   | **62** | **5** |        |

All PR 1 tests are pure unit tests with no DB, HTTP, or browser dependencies, consistent with the foundation scope.

## Changed File Coverage

Coverage analysis skipped — `@vitest/coverage-v8` is not installed.

## Assertion Quality

**Assertion quality**: ✅ All assertions verify real behavior.

No tautologies, ghost loops, type-only assertions, or smoke-test-only cases were found in the new test files.

## Quality Metrics

| Tool               | Result                                      |
| ------------------ | ------------------------------------------- |
| Linter (eslint)    | ✅ No errors/warnings on changed cart files |
| Type Checker (tsc) | ✅ No errors project-wide                   |

## Issues

### CRITICAL Issues

None.

### WARNING Issues

1. **DB-level uniqueness of ACTIVE cart not enforced**
   - Spec REQ-CART-001 states a user MUST have at most one ACTIVE cart at a time.
   - The Prisma schema only defines `@@index([userId, status])`, not a unique index/constraint.
   - Duplicate ACTIVE carts are possible at the database level; application/use-case logic in PR 2 must enforce the rule consistently.

2. **Design deviation: `CartItemEntity.unitPriceSnapshot` uses `Money` instead of `number`**
   - The design contract explicitly lists `unitPriceSnapshot: number`.
   - The implementation uses `Money` from `shared/kernel`.
   - This is more type-safe and matches the spec's "Decimal / EUR" intent, but it is a contract deviation that PR 2 adapters must handle correctly when mapping to/from Prisma `Decimal`.

3. **Design deviation: `CartRepository` method set differs from design contract**
   - Design listed `findByUserId`; implementation provides `findActiveByUserId` plus extra `findById` and `findItemsByCartId`.
   - The deviation improves alignment with spec (active-cart lookup) and testability, but consumers written against the design contract may need adjustment.

### SUGGESTIONS

1. **Consider expanding `ProductSnapshot` for presentation needs**
   - Current `ProductSnapshot` only exposes `id`, `basePrice`, `sellerId`.
   - The spec's `CartItemDTO` requires `productName`, `productImageUrl`, and `sellerName`.
   - PR 2 should either extend the snapshot or add a separate product-name lookup port to avoid ad-hoc cross-module imports.

2. **Add DB-level partial unique constraint when feasible**
   - If the target PostgreSQL version supports partial unique indexes, consider `@@unique([userId, status])` with a filtered index on `status = 'ACTIVE'` to make the "one active cart" rule database-enforced.

3. **Document entity invariant enforcement strategy**
   - `CartEntity` and `CartItemEntity` are pure interfaces, so invariants such as "checked-out cart rejects mutations" must live in use cases.
   - Ensure PR 2 use-case tests explicitly cover these invariants.

## Verdict

**PASS WITH WARNINGS**

PR 1 foundation is complete, type-safe, lint-clean, and all 62 new tests pass. The Prisma schema, domain value objects, entities, errors, ports, and test double are in place and align with the spec intent. The warnings are design/contract deviations and a missing DB-level uniqueness guarantee that should be addressed or consciously accepted before PR 2 begins.
