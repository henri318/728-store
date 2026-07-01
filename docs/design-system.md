# Design System -- 728store

## Design Tokens

All design tokens are defined as CSS custom properties in `shared/presentation/design-tokens.css`.

### Colors

| Token                      | Value                     | Usage                                |
| -------------------------- | ------------------------- | ------------------------------------ |
| `--color-green-dark`       | `#0D5C46`                 | Primary brand color, header, buttons |
| `--color-cream`            | `#F4F2E6`                 | Page background                      |
| `--color-coral`            | `#DF8072`                 | Accent, alerts, highlights           |
| `--color-green-light`      | `#CBE08C`                 | Success states, secondary accents    |
| `--color-lila`             | `#B1ACCD`                 | Tertiary accent                      |
| `--color-white`            | `#FFFFFF`                 | Cards, modals, inputs                |
| `--color-black`            | `#000000`                 | Body text                            |
| `--color-link`             | `#0070f3`                 | Link text, interactive elements      |
| `--color-success`          | `#52c41a`                 | Success messages, confirmations      |
| `--color-danger`           | `#ff4d4f`                 | Error messages, destructive actions  |
| `--color-warning`          | `#faad14`                 | Warning states                       |
| `--color-border`           | `#e0e0e0`                 | Default borders                      |
| `--color-border-strong`    | `#ddd`                    | Stronger borders (cards, inputs)     |
| `--color-green-dark-hover` | `#0a4a38`                 | Hover state for green-dark buttons   |
| `--color-text-secondary`   | `#666`                    | Muted/secondary text                 |
| `--color-row-hover`        | `rgb(193 224 140 / 0.15)` | Table row hover                      |

### Typography

| Token                    | Value                              |
| ------------------------ | ---------------------------------- |
| `--font-family-primary`  | `'Poppins', system-ui, sans-serif` |
| `--font-weight-regular`  | `400`                              |
| `--font-weight-medium`   | `500`                              |
| `--font-weight-semibold` | `600`                              |
| `--font-weight-bold`     | `700`                              |

### Spacing

| Token          | Value     |
| -------------- | --------- |
| `--spacing-xs` | `0.25rem` |
| `--spacing-sm` | `0.5rem`  |
| `--spacing-md` | `1rem`    |
| `--spacing-lg` | `1.5rem`  |
| `--spacing-xl` | `2rem`    |

### Shadows

| Token           | Value                         | Usage         |
| --------------- | ----------------------------- | ------------- |
| `--shadow-card` | `0 1px 4px rgb(0 0 0 / 0.08)` | Card surfaces |

### Border Radius

| Token           | Value  | Usage                             |
| --------------- | ------ | --------------------------------- |
| `--radius-sm`   | `4px`  | Small elements (inputs, badges)   |
| `--radius-md`   | `8px`  | Cards, modals                     |
| `--radius-lg`   | `12px` | Large containers                  |
| `--radius-pill` | `24px` | Pill-shaped buttons, qty controls |

### Z-index

| Token          | Value | Context             |
| -------------- | ----- | ------------------- |
| `--z-base`     | `0`   | Default stacking    |
| `--z-blobs`    | `10`  | Decorative blobs    |
| `--z-content`  | `20`  | Main content        |
| `--z-header`   | `100` | Site header         |
| `--z-banner`   | `200` | Header banner       |
| `--z-dropdown` | `300` | Dropdown menus      |
| `--z-modal`    | `400` | Modals and overlays |

### Icon Sizes

| Token            | Value  |
| ---------------- | ------ |
| `--icon-size-sm` | `24px` |
| `--icon-size-md` | `32px` |
| `--icon-size-lg` | `48px` |

## Components

### Shared UI (`shared/ui/`)

| Component                   | Description                                         | Import        |
| --------------------------- | --------------------------------------------------- | ------------- |
| `Button`                    | Generic button (primary/secondary/danger + loading) | `@/shared/ui` |
| `Input`                     | Generic input with label and error                  | `@/shared/ui` |
| `Modal`                     | Generic modal with portal + Escape key              | `@/shared/ui` |
| `ErrorMessage`              | Inline error alert                                  | `@/shared/ui` |
| `EyeToggleWrapper`          | Password input with show/hide toggle                | `@/shared/ui` |
| `PasswordStrengthIndicator` | Password strength bar (3 criteria)                  | `@/shared/ui` |
| `DeleteConfirmModal`        | Confirmation modal for destructive actions          | `@/shared/ui` |
| `SearchForm`                | Server-side search form with hidden fields          | `@/shared/ui` |
| `DataTable`                 | Generic column-driven data table                    | `@/shared/ui` |
| `Pagination`                | Prev/Next pagination with page info                 | `@/shared/ui` |
| `StatusBadge`               | Status badge with color-coded variants              | `@/shared/ui` |
| `AuthCard`                  | Centered card wrapper for auth forms                | `@/shared/ui` |
| `Card`                      | Generic card surface (white bg, shadow, radius)     | `@/shared/ui` |
| `QuantityControls`          | -/qty/+ controls with clamp logic                   | `@/shared/ui` |
| `HeroSection`               | Landing page hero with wave SVG                     | `@/shared/ui` |
| `MiddleSection`             | Landing page product grid wrapper                   | `@/shared/ui` |
| `BottomSection`             | Landing page bottom CTA                             | `@/shared/ui` |
| `WaveTransition`            | Animated SVG wave divider                           | `@/shared/ui` |
| `SocialFooter`              | Social media links footer                           | `@/shared/ui` |
| `HeaderBanner`              | Scrolling promo text banner                         | `@/shared/ui` |

### Shared Layout (`shared/layout/`)

| Component                   | Description                                      | Import            |
| --------------------------- | ------------------------------------------------ | ----------------- |
| `HeaderNav`                 | Top nav with login/user-menu + cart + role links | `@/shared/layout` |
| `LanguageSelector`          | Locale switcher (es/cat)                         | `@/shared/layout` |
| `SessionProviderWrapper`    | NextAuth SessionProvider wrapper                 | `@/shared/layout` |
| `VerificationBannerWrapper` | Checks session for unverified email              | `@/shared/layout` |
| `VerifyBanner`              | Resend verification email banner                 | `@/shared/layout` |
| `UserMenuDropdown`          | Authenticated user dropdown menu                 | `@/shared/layout` |
| `RoleNavLinks`              | Role-based navigation links                      | `@/shared/layout` |
| `LoginModal`                | Login form modal (Google + credentials)          | `@/shared/layout` |

### Helper Utilities

| Helper               | Location                             | Purpose                                 |
| -------------------- | ------------------------------------ | --------------------------------------- |
| `resolveStatusLabel` | `shared/presentation/status-labels`  | Maps status to i18n label               |
| `buildPageUrl`       | `shared/presentation/build-page-url` | Builds paginated URLs with query params |
| `requireAdmin`       | `shared/authorization/require-admin` | Server-side admin role guard            |
| `checkPasswordMatch` | `shared/validation/password-match`   | Password confirmation validator         |

## Usage

Import globals.css in the root layout to load all tokens:

```tsx
import '../globals.css';
```

Reference tokens in CSS Modules:

```css
.button {
  background: var(--color-green-dark);
  color: var(--color-white);
  font-weight: var(--font-weight-semibold);
}
```

### DataTable + Pagination + StatusBadge

```tsx
import { DataTable, Pagination, StatusBadge } from '@/shared/ui';
import { buildPageUrl, resolveStatusLabel, PRODUCT_STATUS_LABELS } from '@/shared/presentation';

const columns = [
  { key: 'name', header: dict.name, render: (p) => p.name },
  { key: 'status', header: dict.status, render: (p) => (
    <StatusBadge status={p.status} label={resolveStatusLabel(p.status, PRODUCT_STATUS_LABELS, dict)} />
  )},
];

<DataTable columns={columns} rows={products} rowKey={(p) => p.id} />
<Pagination
  currentPage={page}
  totalPages={totalPages}
  buildPageUrl={(p) => buildPageUrl(basePath, p, { q })}
  prevLabel="&larr;"
  nextLabel="&rarr;"
/>
```

### AuthCard

```tsx
import { AuthCard } from '@/shared/ui';

<AuthCard>
  <h1>{dict.auth.signin}</h1>
  <form>...</form>
</AuthCard>;
```

### QuantityControls

```tsx
import { QuantityControls } from '@/shared/ui';

<QuantityControls value={qty} onChange={setQty} variant="compact" />;
```

### requireAdmin (server components)

```tsx
import { requireAdmin } from '@/shared/authorization/require-admin';

export default async function AdminPage({ params: { locale } }) {
  await requireAdmin(locale);
  return <div>...</div>;
}
```
