# Folder Structure

## Project Structure

```plaintext
/modules
  /auth           -- domain, application, infrastructure, presentation (schemas)
  /cart           -- domain, application, infrastructure, presentation (components + context + schemas)
  /customizations -- domain, application, infrastructure, presentation (schemas)
  /email          -- domain, infrastructure
  /events         -- domain, infrastructure
  /orders         -- domain, application, infrastructure, presentation (schemas)
  /payments       -- domain
  /products       -- domain, application, infrastructure, presentation (components + schemas)
  /roles          -- domain, application, infrastructure
  /sellers        -- domain, application, infrastructure, presentation (components + schemas)
  /tickets        -- domain
  /uploads        -- domain, application, infrastructure, presentation (schemas)
  /users          -- domain, application, infrastructure

/shared
  /authorization  -- role-based access control (assertRole, requireAdmin)
  /contracts      -- port interfaces
  /i18n           -- dictionary context + locale files
  /infrastructure -- prisma, auth, outbox
  /kernel         -- domain primitives, value objects, config
  /presentation   -- design-tokens.css, sprites.css, error-handler, status-labels, build-page-url
  /ui             -- shared UI primitives (Button, Input, Modal, DataTable, Pagination, etc.)
  /layout         -- layout-specific components (HeaderNav, LoginModal, LanguageSelector, etc.)
  /validation     -- validation helpers (password-match)

/app
  /[locale]       -- Next.js App Router pages (thin RSC shells)
  /api            -- API route handlers

/workers          -- background workers (outbox, email)
```

## Component Location Rules

1. **`shared/ui/`** -- Pure reusable UI primitives. No domain logic, no module dependencies.
   - Examples: Button, Input, Modal, DataTable, Pagination, StatusBadge, Card, AuthCard, QuantityControls
   - Import via barrel: `import { Button } from '@/shared/ui'`

2. **`shared/layout/`** -- Components used exclusively in the root layout (`app/[locale]/layout.tsx`).
   - Examples: HeaderNav, LanguageSelector, LoginModal, SessionProvider, UserMenuDropdown
   - Import via barrel: `import { HeaderNav } from '@/shared/layout'`

3. **`modules/{module}/presentation/components/`** -- Domain-specific UI components.
   - Belong to a specific module; may import from that module's domain/application layers.
   - Examples: `modules/cart/presentation/components/cart-view.tsx`, `modules/sellers/presentation/components/seller-actions.tsx`
   - Import via explicit path: `import { CartView } from '@/modules/cart/presentation/components/cart-view'`

4. **`app/[locale]/**/page.tsx`\*\* -- Thin RSC shells. No heavy client logic. Delegate to module presentation components.

5. **No top-level `components/` directory** -- All components live in either `shared/` or `modules/`.

## Dependency Direction

```
shared/ui  <--  shared/layout  <--  app/ pages  <--  modules/*/presentation/components
```

- `shared/ui` has ZERO dependencies on modules.
- `shared/layout` may depend on `shared/ui` but NOT on modules.
- Module presentation components may depend on `shared/ui` and their own module's domain/application.
- `app/` pages orchestrate -- they import from modules and shared, but contain no business logic.

## When to Create a New Shared Component

Create in `shared/ui/` when:

- The component is used in 3+ files across different modules or pages.
- The component has no domain-specific logic.
- The component is a UI primitive (button, input, modal, table, badge, etc.).

Create in `modules/{module}/presentation/components/` when:

- The component is specific to one domain (cart, products, sellers, etc.).
- The component needs access to that module's domain/application layer.
- The component is only used within that module's pages.

## When to Extract a Helper Utility

Create in `shared/presentation/` or `shared/validation/` when:

- The same logic appears in 3+ files.
- The logic is not domain-specific (presentation or validation logic).
- Examples: `buildPageUrl`, `resolveStatusLabel`, `checkPasswordMatch`

Create in `shared/authorization/` when:

- The logic is about role-based access control.
- Examples: `requireAdmin`
