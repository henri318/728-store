# Tasks: Fix Admin Workflows — Role Fix, Navigation, Profile Guard, Admin Dashboard, E2E

## Review Workload Forecast

| Field                   | Value                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Estimated changed lines | ~720–850                                                                               |
| 800-line budget risk    | High                                                                                   |
| Chained PRs recommended | Yes                                                                                    |
| Suggested split         | PR 1 (Batch 1–3, ~250 lines) → PR 2 (Batch 4, ~350 lines) → PR 3 (Batch 5, ~200 lines) |
| Delivery strategy       | ask-on-risk                                                                            |
| Chain strategy          | pending                                                                                |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
800-line budget risk: High

### Suggested Work Units

| Unit | Goal                                                 | Likely PR | Notes                                                  |
| ---- | ---------------------------------------------------- | --------- | ------------------------------------------------------ |
| 1    | SELLER→DESIGNER fix + role-based nav + profile guard | PR 1      | Base: main. Tests included. Foundation for admin pages |
| 2    | Admin seller/product pages + API + use case          | PR 2      | Base: PR 1 branch. Depends on Unit 1                   |
| 3    | E2E test suite (fixtures + 3 spec files)             | PR 3      | Base: PR 2 branch. Depends on Unit 2                   |

---

## Batch 1: SELLER→DESIGNER Role Fix

- [ ] **T1** — Update `RoleId.create('SELLER')` → `RoleId.create('DESIGNER')` in `modules/sellers/application/use-cases/create-seller-with-user-use-case.ts` line 89. Update JSDoc comment on line 37 to reference DESIGNER role.
- [ ] **T2** — Update test assertion: `tests/unit/modules/sellers/application/create-seller-with-user-use-case.test.ts` — change `toBe('SELLER')` → `toBe('DESIGNER')` on line 65; rename test description on line 53 from "SELLER role" to "DESIGNER role".
- [ ] **T3** — Update `tests/integration/products/prisma-product-repository.integration.test.ts` line 29: `role: 'SELLER'` → `role: 'DESIGNER'`.
- [ ] **T4** — Update `tests/integration/orders/prisma-order-repository.integration.test.ts` line 59: `role: 'SELLER'` → `role: 'DESIGNER'`.
- [ ] **T5** — Update `tests/unit/app/api/sellers/[id]/route.test.ts` line 70: `role: 'SELLER'` → `role: 'DESIGNER'`.
- [ ] **T6** — Verify: `grep -r "RoleId.create('SELLER')" modules/ tests/` returns zero matches. Run `tsc --noEmit` and `npm test`.

## Batch 2: Role-Based Navigation

- [ ] **T7** — Create `modules/presentation/components/role-nav-links.tsx`. Component accepts `{ role?: string | null; locale: string }`. If `role === 'ADMIN'`, render Dashboard link to `/{locale}/admin/sellers`. If `role === 'DESIGNER'`, render Designer Panel link. Otherwise render nothing. Use Link from `next/link`.
- [ ] **T8** — Modify `modules/presentation/components/header-nav.tsx`. Import `RoleNavLinks`. In the authenticated branch (line 18), render `<RoleNavLinks role={session.user.role} locale={...} />` alongside `<UserMenuDropdown>`. Extract locale from `useParams`.
- [ ] **T9** — Modify `modules/presentation/components/user-menu-dropdown.tsx`. Add `role?: string | null` to `UserMenuDropdownProps` interface (line 15). In the dropdown content (line 66), conditionally render "Dashboard" link (ADMIN) or "Designer Panel" link (DESIGNER) as first menuitem before Profile.
- [ ] **T10** — Write test: `tests/unit/modules/presentation/components/role-nav-links.test.tsx`. Test: renders Dashboard link when `role='ADMIN'`, renders Designer Panel link when `role='DESIGNER'`, renders nothing for CUSTOMER/SUPPORT/undefined.
- [ ] **T11** — Update test: `tests/unit/modules/presentation/components/user-menu-dropdown.test.tsx`. Add test for role-based menu items: ADMIN sees Dashboard, DESIGNER sees Designer Panel, CUSTOMER sees only standard items. Pass `role` prop in existing mockUser.

## Batch 3: Profile Guard

- [ ] **T12** — Modify `app/[locale]/profile/page.tsx`. Extract role from session: `const role = session?.user?.role`. Add `const showAddress = role === 'CUSTOMER'`. Wrap the `<div className={styles.addressSection}>` block (lines 180–224) in `{showAddress && ...}`. In `handleSave`, strip `body.address` when `!showAddress` (line 105: only include address if `showAddress`).
- [ ] **T13** — Write test: Add a test to `tests/e2e/auth/profile.spec.ts` or new unit test that verifies address section is not rendered when role is not CUSTOMER.

## Batch 4: Admin Pages, API, and Use Case

- [ ] **T14** — Add `findBySellerId` to `modules/products/domain/product-repository.ts`: `findBySellerId(sellerId: string, locale: string): Promise<ProductEntity[]>`.
- [ ] **T15** — Implement `findBySellerId` in `modules/products/infrastructure/prisma-product-repository.ts`. Query `prisma.product.findMany({ where: { sellerId }, include: { seller: true, translations: { where: { locale } }, customizations: true, images: { orderBy: { position: 'asc' } }, tags: true } })`. Map via `toDomainProduct`.
- [ ] **T16** — Add `findBySellerId` stub to `tests/doubles/memory-product-repository.ts`. Filter by sellerId, then by locale translations.
- [ ] **T17** — Create `modules/products/application/use-cases/admin-list-seller-products-use-case.ts`. DTO: `{ sellerId: string; locale: string }`. Constructor takes `ProductRepository`. Execute delegates to `productRepository.findBySellerId(dto.sellerId, dto.locale)`.
- [ ] **T18** — Write test: `tests/unit/modules/products/application/use-cases/admin-list-seller-products.test.ts`. Mock `ProductRepository`, verify `findBySellerId` called with correct args, returns products.
- [ ] **T19** — Create `app/api/admin/sellers/[sellerId]/products/route.ts`. GET handler. Wrap with `requireRole('ADMIN')`. Instantiate `AdminListSellerProductsUseCase` with PrismaProductRepository. Return `{ products: [...] }`.
- [ ] **T20** — Create `app/[locale]/admin/sellers/page.tsx` (Server Component). Fetch sellers from `GET /api/sellers` (existing endpoint with ADMIN auth). Render table: Name, Email, Status (badge colors), Created, "View Products" link to `/{locale}/admin/sellers/{sellerId}/products`.
- [ ] **T21** — Create `app/[locale]/admin/sellers/[sellerId]/products/page.tsx` (Server Component). Fetch products from `GET /api/admin/sellers/{sellerId}/products`. Render table: Product Name, Status, Price, Created. Back link to `/admin/sellers`. Show "Seller not found" or "No products found" empty states.

## Batch 5: E2E Tests

- [ ] **T22** — Create `tests/e2e/admin/fixtures.ts`. Playwright fixtures using `storageState`: `adminPage` (authenticated ADMIN), `designerPage` (authenticated DESIGNER), `customerPage` (authenticated CUSTOMER). Use `test.extend` pattern.
- [ ] **T23** — Create `tests/e2e/admin/sellers.spec.ts`. Scenarios: (1) Admin sees Dashboard link → navigates to `/admin/sellers` → table renders with seller data. (2) Admin clicks "View Products" → navigates to product list. (3) DESIGNER navigates to `/admin/sellers` → 403/redirect.
- [ ] **T24** — Create `tests/e2e/admin/products.spec.ts`. Scenarios: (1) Admin views product list for a seller → table visible. (2) Seller with no products → empty state. (3) Back link navigates to seller list.
- [ ] **T25** — Create `tests/e2e/admin/profile.spec.ts`. Scenarios: (1) ADMIN profile → address section NOT visible. (2) CUSTOMER profile → address section visible. (3) DESIGNER profile → address section NOT visible.

## Dependencies

```
T1–T6 (Batch 1)     ─── no deps ───→ PR 1
T7–T11 (Batch 2)    ─── depends on T1 ───→ PR 1
T12–T13 (Batch 3)   ─── depends on T1 ───→ PR 1
T14–T16 (Batch 4a)  ─── depends on T1 ───→ PR 2
T17–T19 (Batch 4b)  ─── depends on T14–T16 ───→ PR 2
T20–T21 (Batch 4c)  ─── depends on T17–T19 ───→ PR 2
T22–T25 (Batch 5)   ─── depends on T7–T21 ───→ PR 3
```

## Estimated Lines

| Batch              | Files  | New      | Modified | Subtotal |
| ------------------ | ------ | -------- | -------- | -------- |
| 1: Role Fix        | 5      | 0        | ~8       | ~8       |
| 2: Navigation      | 4      | ~60      | ~25      | ~85      |
| 3: Profile Guard   | 1      | 0        | ~8       | ~8       |
| 4: Admin Pages/API | 7      | ~320     | ~30      | ~350     |
| 5: E2E Tests       | 4      | ~280     | 0        | ~280     |
| **Total**          | **21** | **~660** | **~71**  | **~731** |

Risk assessment: **High** — exceeds 800-line budget at ~731 estimated lines (accounting for margin, likely 800–900 actual). Chained PRs recommended.

### Next Step

Ask the user which chain strategy to use before sdd-apply. Suggested: **stacked-to-main** (PR 1 → PR 2 → PR 3, each merging to main in order).
