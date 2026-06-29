# Exploration: Customizations Module

## Current State

The codebase **already has a partial customization implementation** spread across the `products` module, but it is **tightly coupled to products and duplicated into cart/order schemas**. There is no standalone `customizations` module today.

Key findings:

- **Legacy note**: `ProductCustomization` used to be a child entity of `Product` (it lived in `modules/products/domain/entities/product-customization.ts`) and the `ProductCustomization` Prisma model had a hard FK to `Product` (no standalone id ownership outside a product).
- The four customization fields (`text`, `color`, `size`, `imageUrl`) are **duplicated as denormalized columns** on `CartItem` and `OrderLineItem` (Prisma models + entities).
- A `CustomizationOptions` value object exists in `modules/products/domain/value-objects/customization-options.ts`, but it lives in the products module, so cart and orders can only reach it through the products module's adapter — a hexagonal violation for what should be shared kernel data.
- The doc `docs/entities.md` already shows the _target_ shape with `OrderItem.customizationId` (FK), so this exploration is the bridge from the current denormalized shape to the documented target.

## Affected Areas

### Entities (current location)

- `prisma/schema.prisma` — `ProductCustomization` (FK to Product), `CartItem.customization*` columns, `OrderLineItem.customization*` columns.
- `modules/products/domain/entities/product-customization.ts` — legacy products-owned customization entity (removed in PR4 cleanup).
- `modules/products/domain/entities/product.ts` — product no longer owns customization collection.
- `modules/products/domain/value-objects/customization-options.ts` — VO enforcing 500-char text, 50-char color/size, https URL.
- `modules/products/domain/product-events.ts` — declares local product events; customization-related event constant lives in `events/event-registry.ts` instead (`PRODUCT_CUSTOMIZATION_CREATED`).
- `modules/cart/domain/entities/cart-item.ts` — carries `customizationText/Color/Size/ImageUrl` strings.
- `modules/cart/domain/product-snapshot.ts` — minimal product view (no customization data exposed).
- `modules/cart/infrastructure/cart-product-repository-adapter.ts` — adapter from products port to products module; currently returns only `id`, `basePrice`, `sellerId`.
- `modules/cart/application/checkout-cart.ts` — copies customization fields into the `CART_CHECKED_OUT` event payload (lines 120-123).
- `modules/orders/domain/entities/order-line-item.ts` — same denormalized fields copied from cart payload.
- `modules/orders/domain/product-snapshot.ts` — minimal product view (no customization data).
- `modules/orders/application/handle-cart-checked-out.ts` — copies customization fields from cart payload to `OrderLineItem` (lines 70-79).

### Docs to update

- `docs/architecture.md` — module list will grow.
- `docs/folder-structure.md` — add `customizations` to the tree.
- `docs/entities.md` — promote `Customization` to first-class entity with its own section; remove "OrderItem.customizationId" mismatch.
- `docs/event-bus.md` — new base event `CustomizationCreated` / `CustomizationUpdated` (or whatever naming the proposal settles on).
- `docs/module-carts.md`, `docs/module-orders.md` — describe that they only carry `customizationIdList[]`.

## Approaches

### Option A — Promote Customizations to its own module (RECOMMENDED)

Move `Customization` to a new top-level `modules/customizations/` module. The product module drops its `ProductCustomization` child collection. Customizations become first-class entities owned by sellers (consistent with the multi-vendor rule).

- **Customizations module owns**: `Customization` entity, `CustomizationRepository`, `createCustomizationForProduct` use case, product-bound read APIs.
- **Products module**: still owns `Product`, still defines what a product is, but stops owning customizations. Adds a `customizationIdList: CustomizationId[]` (or product-port lookup) to its snapshot, or a port `ProductCustomizationLookupPort` resolved by the composition root into the customizations adapter.
- **Cart module**: drops the four `customization*` columns from `CartItem`. Stores only `customizationIdList: CustomizationId[]`. At checkout the cart resolves the list via the `CustomizationRepository` port and embeds an **immutable snapshot** in the `CART_CHECKED_OUT` event payload.
- **Orders module**: drops the four `customization*` columns from `OrderLineItem`. Stores a JSON-serialized immutable `CustomizationSnapshot` (text/color/size/imageUrl/customizationId) per line. Once an order is created, the customization snapshot is frozen — even if the seller later edits the customization, the order keeps what was paid for.

| Pros                                                                              | Cons                                                                                                                                                   | Effort |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Cleanest module boundary; matches the user's intent and the existing docs target. | Requires Prisma migration that drops and recreates `ProductCustomization` as a first-class table; touches cart and orders schemas; multi-step rollout. | High   |

### Option B — Keep Customizations inside Products, refactor only the data shape

Leave `ProductCustomization` under products but stop denormalizing its fields into Cart and Order tables. Cart and Order keep only FKs.

- **Products module** still owns customization lifecycle (CRUD, validation, product-binding).
- **Cart module** stores `customizationIdList: string[]` (FKs into `ProductCustomization`).
- **Orders module** resolves the ids and embeds the immutable snapshot on order creation.

| Pros                                                                                       | Cons                                                                                                                                                                                            | Effort |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Smaller blast radius; no new module skeleton; reuse existing `ProductCustomization` table. | "Customizations module" is reduced to a sub-namespace inside products; the new boundary the user asked for is half-delivered. Cart and Orders still depend on Products for customization reads. | Medium |

### Option C — Minimal: keep denormalized fields, add `customizationIdList` on top

Add `customizationIdList: string[]` to `CartItem` and `OrderLineItem` alongside the existing four `customization*` columns. Do not refactor.

| Pros                                             | Cons                                                                                                                                                                                                                      | Effort |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Trivially small diff; lowest risk of regression. | Does not solve duplication. Customization lifecycle still lives in products. Two sources of truth (the ids AND the denormalized fields) will drift. User explicitly asked for cart to "only store `customizationIdList`". | Low    |

## Recommendation

**Option A** — promote to a real `customizations` module. The reasoning:

1. The user explicitly asked for a `Customizations module` that is _independent_. Option C explicitly violates the user's "CartItem should only store `customizationIdList`" requirement. Option B only delivers half the boundary.
2. `docs/entities.md` already documents the target shape (`OrderItem.customizationId` FK to a standalone `Customization`). The current code is the in-between state. Doing the full refactor now closes the gap.
3. The hexagonal architecture is already in place (ports, adapters, composition root). There is no infra cost to creating a new module — the skeleton is repeatable from `products` or `sellers`.
4. The `CustomizationOptions` value object currently sits in products; it should move to the customizations module (or `shared/kernel`) so cart and orders can use the same validation rules without going through the products adapter.

Suggested slice order (informational, not part of the spec yet):

1. Create `modules/customizations/` with entity, VO, repository port, Prisma adapter, and a `CreateCustomizationForProduct` use case.
2. Migrate `ProductCustomization` table to a top-level `Customization` table (keep `productId` FK).
3. Remove `customizations: ProductCustomization[]` from `Product`; replace with a port-driven lookup or a denormalized `customizationIdList: CustomizationId[]` on the product snapshot consumed by cart/orders.
4. Strip the four `customization*` columns from `CartItem` and `OrderLineItem`. Add `customizationIdList: CustomizationId[]` to `CartItem` only.
5. On `CART_CHECKED_OUT`, the cart resolves customizations via the port and embeds the snapshot in the event payload.
6. `HandleCartCheckedOut` writes the **immutable snapshot** onto `OrderLineItem` (a `customizationSnapshot: { id, text, color, size, imageUrl, snapshotAt }` JSON column or a typed child table). The line item never re-reads the source `Customization` after that.

## Risks

- **Idempotency of `CART_CHECKED_OUT` vs customization mutation**: if a user checks out, then a seller edits the customization before the order handler runs, the handler must read the _frozen_ snapshot from the event payload, not re-resolve ids. Mitigation: the cart embeds the snapshot at confirm time; the order handler treats the payload as the source of truth.
- **Guest cart migration**: the `GuestCartItem` shape (see `docs/module-carts.md` line 50) currently carries denormalized fields. With Option A the guest shape must also change to `customizationIdList: string[]`, and the migration use case (`migrate-guest-cart.ts`) must resolve customizations through the same port — or fall back to inline data when running offline.
- **Multi-seller rule**: `Customization` is a seller-scoped child of `Product`, which is itself seller-scoped, so the new entity must carry `sellerId` directly (not just inherit via `productId`) to support cross-seller lookups and authorization checks in admin contexts.
- **Outbox + transaction**: the cart's `confirm` writes the cart status + the `CART_CHECKED_OUT` outbox row in one transaction. The new flow must read the customization snapshot **inside the same transaction** to avoid TOCTOU between read and emit.
- **Validation drift**: the `CustomizationOptions` VO currently lives in products. If the new module introduces its own VO, both must agree on rules (500/50/50/https) — easiest path is to move the existing VO into `customizations` and import it from there (products loses the duplication but no longer owns the rule).
- **Existing product-customization data**: any in-flight `ProductCustomization` rows need a backfill path in the migration. The Prisma model rename from `ProductCustomization` to `Customization` is fine if no external system references the old name.
- **`hexagonal-architecture-violations.md` doc**: the current placement of `CustomizationOptions` inside products and the duplication of fields across cart/orders are both flagged violations. Option A resolves both.

## Ready for Proposal

Yes. The orchestrator can move to the **propose** phase with the following framing for the user:

> "Your current code already has a half-built customization flow: a `ProductCustomization` child entity inside products, plus denormalized `customization*` columns on CartItem and OrderLineItem. The cleanest path to the design you described is to extract Customizations into its own module, drop the denormalized columns, and have cart and orders pass `customizationIdList[]` plus a one-time immutable snapshot at checkout. Option A is the recommended approach; the proposal should confirm the migration approach for in-flight data and the exact snapshot shape frozen into OrderLineItem."
