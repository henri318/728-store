# Cart Module

## Overview

The Cart module manages shopping carts for both guest (localStorage) and authenticated (server) users. It supports multi-seller carts, optimistic UI updates, price-change detection at checkout, and guest-to-server cart migration on login.

## Architecture

- **Domain**: Cart + CartItem entities, CartStatus VO, domain errors, repository ports.
- **Application**: 6 use cases (AddItemToCart, UpdateCartItemQuantity, RemoveCartItem, GetCart, CheckoutCart, MigrateGuestCart).
- **Infrastructure**: PrismaCartRepository, CartProductRepositoryAdapter, PrismaPaidOrderCountAdapter.
- **Presentation**: Zod schemas, API routes, guest cart context (React), cart page, checkout page, merge dialog, guest badge.

## API Routes

| Method | Path                         | Auth | Description                                |
| ------ | ---------------------------- | ---- | ------------------------------------------ |
| GET    | `/api/cart`                  | Yes  | Get user's ACTIVE cart with enriched items |
| POST   | `/api/cart/items`            | Yes  | Add a product to the cart                  |
| PATCH  | `/api/cart/items/[itemId]`   | Yes  | Update item quantity                       |
| DELETE | `/api/cart/items/[itemId]`   | Yes  | Remove an item from the cart               |
| POST   | `/api/cart/checkout`         | Yes  | Preview checkout totals (read-only)        |
| POST   | `/api/cart/checkout/confirm` | Yes  | Confirm checkout (atomic status + outbox)  |
| POST   | `/api/cart/migrate`          | Yes  | Migrate guest cart to server cart          |

## UI Flow

### Authenticated User

1. Browse products → add to cart (POST `/api/cart/items`).
2. Visit `/cart` → see items with optimistic +/-/remove controls.
3. Visit `/checkout` → see items grouped by seller, totals (subtotal, discount, shipping, total).
4. Click "Place Order" → POST `/api/cart/checkout` (preview) → POST `/api/cart/checkout/confirm`.
5. On success → redirect to `/orders/{orderId}`.
6. On price change (409) → show dialog → accept or cancel.

### Guest User

1. Browse products → add to guest cart (localStorage via GuestCartContext).
2. Guest cart badge shows item count in header.
3. Visit `/cart` → see guest cart items from localStorage.
4. On login → if both guest and server carts have items → MergeDialog appears.
5. Choose strategy: "Merge both" / "Keep server cart" / "Keep guest cart".
6. POST `/api/cart/migrate` → server processes → localStorage cleared → server cart displayed.

## Guest Cart Storage

- Key: `cart:guest:v1`
- Shape: `{ items: GuestCartItem[], updatedAt: string }`
- `GuestCartItem`: `{ productId, sellerId, quantity, unitPriceSnapshot: number, customizationText?, customizationColor?, customizationSize?, customizationImageUrl? }`
- `unitPriceSnapshot` is a plain number (not Money) because localStorage cannot serialize class instances.

## Checkout Totals

| Rule                    | Formula                                           |
| ----------------------- | ------------------------------------------------- |
| Subtotal                | Σ (item.unitPriceSnapshot × item.quantity)        |
| First-purchase discount | subtotal × 0.10 if user has 0 PAID orders; else 0 |
| Shipping                | flat €3.99                                        |
| Total                   | subtotal − discount + shipping                    |
| Currency                | EUR only                                          |

## Events Emitted

- `CART_CREATED` — when a new cart is auto-created on first add.
- `CART_ITEM_ADDED` — when an item is added or migrated.
- `CART_ITEM_UPDATED` — when an item's quantity changes.
- `CART_ITEM_REMOVED` — when an item is removed.
- `CART_CHECKED_OUT` — when checkout completes (triggers Order creation).
- `GUEST_CART_MIGRATED` — when a guest cart is migrated to server.

## Key Design Decisions

- **Two-step checkout**: preview (read-only) → confirm (mutates). User must consent to price changes.
- **Multi-seller splitting**: CartCheckedOut payload carries all items with sellerId; Orders handler groups by seller and creates one Order per seller.
- **Guest cart migration**: Server validates prices, filters unavailable products, applies user-chosen strategy.
- **Optimistic UI**: Cart page updates quantity immediately, reverts on PATCH failure.
- **Partial unique index**: `Cart_userId_active_unique` ensures one ACTIVE cart per user at the DB level.
