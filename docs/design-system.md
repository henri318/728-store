# Design System — 728store

## Design Tokens

All design tokens are defined as CSS custom properties in `shared/presentation/design-tokens.css`.

### Colors

| Token                 | Value     | Usage                                |
| --------------------- | --------- | ------------------------------------ |
| `--color-green-dark`  | `#0D5C46` | Primary brand color, header, buttons |
| `--color-cream`       | `#F4F2E6` | Page background                      |
| `--color-coral`       | `#DF8072` | Accent, alerts, highlights           |
| `--color-green-light` | `#CBE08C` | Success states, secondary accents    |
| `--color-lila`        | `#B1ACCD` | Tertiary accent                      |
| `--color-white`       | `#FFFFFF` | Cards, modals, inputs                |
| `--color-black`       | `#000000` | Body text                            |

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

### IconCircle

Renders a circular icon with optional link wrapper. Uses CSS Module classes.

### HeaderBanner

Client component with scrolling text animation. Supports `prefers-reduced-motion`.

### WaveTransition

SVG wave divider with configurable fill/stroke colors and direction.

### HeroSection

Composes WaveTransition and an image.

### SocialFooter

Fixed 5-icon social media grid (Facebook, Instagram, TikTok, WhatsApp, Email).

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
