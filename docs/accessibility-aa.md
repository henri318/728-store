# Accesibilidad — WCAG 2.2 Nivel AA

> Auditoría de componentes frontend del proyecto **Modular E-commerce**.
> Fecha: 2026-06-14

---

## Resumen

Estado actual: **No conforme**. No se aplicaron criterios de accesibilidad en el desarrollo.

| Nivel | Criterios aplicables | Cumplidos | % |
|-------|---------------------|-----------|---|
| A (obligatorio) | 30 | ~3 | ~10% |
| AA (objetivo) | 20 | ~0 | ~0% |

---

## Pautas y criterios evaluados

### 1. Perceptible

#### 1.1.1 Texto alternativo (A)

| Componente | Problema | Archivo |
|-----------|----------|---------|
| Placeholder de imagen de producto | `Product Image Placeholder` es un `<span>` sin `alt`. No describe nada. | `products/[id]/page.tsx:27` |
| Sin imágenes reales | No hay productos con `<img>`, pero cuando los haya necesitan `alt` descriptivo | — |

**Solución**: El placeholder debería tener `role="img"` + `aria-label`, y las imágenes reales deben tener `alt` relevante.

#### 1.3.1 Información y relaciones (A)

| Componente | Problema | Archivo |
|-----------|----------|---------|
| Login | Inputs sin `<label>`. Solo usan `placeholder`. No hay asociación programática. | `auth/signin/page.tsx:19-32` |
| Signup | Inputs sin `<label>`. Solo `placeholder`. | `auth/signup/page.tsx:51-74` |
| Language selector | `<select>` sin `<label>` asociado | `language-selector.tsx:15` |
| Productos en grid | Los precios y sellers se marcan solo con estilo (color, bold), no con semántica | `page.tsx:35-36` |
| Detalle de producto | Usa `hidden` inputs sin contexto semántico | `checkout/page.tsx:40-41` |

**Solución**: Todos los inputs deben tener `<label htmlFor="id">` vinculado. El language selector necesita un `<label>` invisible pero accesible (`.sr-only`).

#### 1.4.1 Uso del color (A)

| Componente | Problema | Archivo |
|-----------|----------|---------|
| Error en signup | Error se muestra solo con color rojo (`#cf1322` sobre `#fff1f0`). Sin ícono, sin texto adicional, sin `aria-*` | `auth/signup/page.tsx:47-49` |
| Precio vs otros textos | Precio se distingue solo por `fontWeight: 'bold'` — correcto, pero verificar que no dependa exclusivamente de color | |

**Solución**: Los mensajes de error deben incluir un ícono descriptivo o texto "Error:" y usar `role="alert"`.

#### 1.4.3 Contraste mínimo (AA)

Fallos de contraste identificados:

| Elemento | Texto | Fondo | Ratio | WCAG AA (4.5:1) |
|----------|-------|-------|-------|------------------|
| Product Image Placeholder | `#ccc` (c3c3c3) | `#f9f9f9` | ~1.08:1 | ❌ |
| Seller name en Home | `#666` | `#fff` | ~5.4:1 | ✅ Justo |
| Seller name en detalle | `#888` | `#fff` | ~3.6:1 | ❌ |
| User name en header | `#666` sobre header | `#fff` | ~5.4:1 | ✅ |
| Error text | `#cf1322` sobre `#fff1f0` | | ~4.8:1 | ✅ Justo |
| Links (home, login) | `#0070f3` sobre `#fff` | | ~6.3:1 | ✅ |
| Logout button | `#ff4d4f` sobre `#fff` | | ~4.0:1 | ❌ (para texto normal) |
| Back link detalle | `#0070f3` | | ~6.3:1 | ✅ |
| Subtle text "Image upload..." | `#888` sobre `#fff` | | ~3.6:1 | ❌ |
| Border cards | `#ddd` sobre `#fff` | | ~1.9:1 | ❌ (pero es borde no texto) |

**Solución**: Cambiar colores:
- `#888` → `#595959` (mínimo 4.5:1)
- `#ccc` sobre fondos claros → `#8c8c8c` o eliminar el placeholder
- `#ff4d4f` → `#cf1322` o texto más grande

#### 1.4.4 Cambio de tamaño de texto (AA)

El layout usa `rem` en la mayoría de los casos ✅. Pero algunos botones y textos usan `px`:

| Elemento | Unidad | Archivo |
|----------|--------|---------|
| `font-size: 1.2rem` (h1) | rem ✅ | layout.tsx |
| `font-size: 0.9rem` (user name) | rem ✅ | layout.tsx |
| `font-size: 0.8rem` (seller) | rem ✅ | page.tsx |
| Inputs sin font-size explícito | heredan, OK ✅ | varios |
| `font-size: 1.5rem` (precios) | rem ✅ | checkout/page.tsx |

✅ Aprobado — todo en unidades relativas.

---

### 2. Operable

#### 2.1.1 Teclado (A)

| Problema | Archivo |
|----------|---------|
| Botones sin `:focus-visible` visible en ningún componente | Todos los `button` y `a` |
| Language selector cambia en `onChange` — puede desorientar al usuario de teclado | `language-selector.tsx:10-11` |

**Solución**: Agregar `outline: 2px solid #0070f3` (o similar) en `:focus-visible` a todos los elementos interactivos. Language selector debería tener un botón de confirmación o al menos anunciar el cambio.

#### 2.4.1 Saltar bloques (A)

**No hay "Skip to content"**. El layout siempre muestra header con nav antes del `<main>`. Un usuario de teclado debe tabular todos los links de navegación en cada página.

**Solución**: Agregar un link "Saltar al contenido" como primer elemento del `<body>`:

```tsx
// En layout.tsx, justo después de <body>
<a href="#main-content" 
   style={{ position: 'absolute', left: '-9999px', top: 0, 
            ':focus': { position: 'static' } }}>
  Saltar al contenido
</a>
// ...
<main id="main-content" style={{ padding: '2rem' }}>
```

#### 2.4.2 Título de página (A)

**Ninguna página tiene `<title>`**. El HTML no incluye metadatos de título.

| Página | Título esperado |
|--------|----------------|
| Home | `{dict.common.home} — Modular E-commerce` |
| Login | `Login — Modular E-commerce` |
| Signup | `Register — Modular E-commerce` |
| Producto | `{product.displayName} — Modular E-commerce` |
| Checkout | `Checkout — Modular E-commerce` |

**Solución**: Usar `metadata` export de Next.js en cada página:

```tsx
export const metadata = {
  title: 'Home — Modular E-commerce',
};
```

#### 2.4.3 Orden del foco (A)

Actualmente es secuencial (DOM order) ✅. Sin embargo, el `<Link>` que envuelve un `<button>` en `page.tsx:37-41` crea dos elementos focusables anidados — el link Y el button reciben foco por separado.

**Solución**: Usar solo `<Link>` con estilo de botón, o solo `<button>` con `onClick` y `router.push()`. No anidar elementos interactivos.

#### 2.4.4 Propósito del enlace (A)

| Enlace | Problema |
|--------|----------|
| "View Details" en cards de productos | Son varios links con el mismo texto "View Details". Contextualmente están dentro de cada card, pero no hay un `aria-label` que los diferencie. |

**Solución**: Agregar `aria-label="{dict.common.viewDetails} — {product.name}"` o similar.

#### 2.4.6 Encabezados y etiquetas (AA)

| Página | Encabezados | Problema |
|--------|-------------|----------|
| Layout | `<h1>Modular E-commerce</h1>` | ✅ |
| Home | `<h2>{dict.common.products}</h2>` | ✅ Correcto (h1→h2) |
| Login | `<h2>Login</h2>` | ⚠️ Debería ser `<h1>` ya que no hay otro heading principal en esa página |
| Signup | `<h2>Register</h2>` | ⚠️ Igual, debería ser `<h1>` |
| Producto | `<h1>{product.displayName}</h1>` | ✅ |
| Checkout | `<h2>Checkout Summary</h2>` | ⚠️ Debería ser `<h1>` |

**Solución**: Cada página debe tener exactamente un `<h1>` que describa su contenido principal.

#### 2.4.7 Foco visible (AA)

**Ningún elemento interactivo tiene estilo de foco visible.** Esto es un fallo directo de AA. Todos los botones, inputs, selects, y links deben mostrar un indicador de foco.

**Solución**: Agregar estilos globales:

```css
*:focus-visible {
  outline: 2px solid #0070f3;
  outline-offset: 2px;
}
```

---

### 3. Comprensible

#### 3.2.1 Al recibir el foco (A)

Language selector cambia de idioma inmediatamente al seleccionar una opción (`onChange`). Esto puede causar un cambio de contexto inesperado.

**Solución**: Requerir un botón "Cambiar" después de seleccionar el idioma, o al menos usar `aria-live="polite"` para anunciar el cambio.

#### 3.3.1 Identificación de errores (A)

En signup, si hay error se muestra visualmente pero no hay `aria-describedby` ni `aria-invalid` en los inputs. Un screen reader no sabe qué campo tiene el error.

**Solución**:

```tsx
<input 
  aria-invalid={!!error}
  aria-describedby={error ? 'form-error' : undefined}
/>
{error && <div id="form-error" role="alert">{error}</div>}
```

#### 3.3.2 Etiquetas o instrucciones (A)

Las páginas de login y signup solo usan `placeholder` como "etiqueta". Los placeholders desaparecen al escribir y no son suficientes como etiqueta según WCAG.

**Solución**: Agregar `<label>` visibles o al menos `aria-label`.

#### 3.3.3 Sugerencias ante errores (AA)

Signup muestra error genérico "Algo salió mal" sin sugerir cómo corregirlo. Para el caso "email ya existe" está mejor, pero falta indicar formato de contraseña, etc.

**Solución**: Validar en frontend con mensajes específicos: "La contraseña debe tener al menos 8 caracteres".

#### 3.3.4 Prevención de errores (AA)

El formulario de checkout no tiene confirmación antes de enviar la orden. Un clic accidental en "Confirm and Pay" crea la orden inmediatamente.

**Solución**: Agregar paso de confirmación o botón deshabilitado hasta confirmación explícita.

---

### 4. Robusto

#### 4.1.2 Nombre, rol, valor (A)

| Componente | Problema |
|-----------|----------|
| LogoutButton | El componente recibe `label` como prop en layout (`label={dict.common.logout}`), pero la definición del componente `LogoutButton()` no acepta props. El label se pierde. El botón siempre dice "Logout" en inglés. |
| Language selector | `<select>` sin `aria-label`. Un screen reader no sabe qué selector es. |
| "Product Image Placeholder" | `<span>` sin rol. Debería ser un `img` o tener `role="img"`. |

**Solución**: 
- LogoutButton debe aceptar `label` prop: `export default function LogoutButton({ label }: { label: string })`
- Language selector necesita `aria-label="Seleccionar idioma"`
- Placeholder de imagen: `role="img" aria-label="Imagen de {product.displayName}"`

---

## Checklist completo WCAG 2.2 AA

### Nivel A (obligatorio)

| Criterio | Descripción | Estado |
|----------|-------------|--------|
| 1.1.1 | Non-text Content | ❌ |
| 1.2.1 | Audio-only and Video-only | N/A |
| 1.2.2 | Captions (Prerecorded) | N/A |
| 1.2.3 | Audio Description or Media Alternative | N/A |
| 1.3.1 | Info and Relationships | ❌ |
| 1.3.2 | Meaningful Sequence | ✅ |
| 1.3.3 | Sensory Characteristics | ✅ |
| 1.4.1 | Use of Color | ❌ |
| 1.4.2 | Audio Control | N/A |
| 2.1.1 | Keyboard | ❌ |
| 2.1.2 | No Keyboard Trap | ✅ |
| 2.1.4 | Character Key Shortcuts | N/A |
| 2.2.1 | Timing Adjustable | ⚠️ No verificado |
| 2.2.2 | Pause, Stop, Hide | N/A |
| 2.3.1 | Three Flashes or Below Threshold | N/A |
| 2.4.1 | Bypass Blocks | ❌ |
| 2.4.2 | Page Titled | ❌ |
| 2.4.3 | Focus Order | ❌ (link anidado) |
| 2.4.4 | Link Purpose (In Context) | ❌ |
| 2.5.1 | Pointer Gestures | ✅ |
| 2.5.2 | Pointer Cancellation | ✅ |
| 2.5.3 | Label in Name | ❌ |
| 2.5.4 | Motion Actuation | N/A |
| 3.1.1 | Language of Page | ✅ |
| 3.2.1 | On Focus | ❌ |
| 3.2.2 | On Input | ❌ |
| 3.3.1 | Error Identification | ❌ |
| 3.3.2 | Labels or Instructions | ❌ |
| 4.1.1 | Parsing (obsoleto en WCAG 2.2) | N/A |
| 4.1.2 | Name, Role, Value | ❌ |
| 4.1.3 | Status Messages | ❌ |

### Nivel AA

| Criterio | Descripción | Estado |
|----------|-------------|--------|
| 1.2.4 | Captions (Live) | N/A |
| 1.2.5 | Audio Description (Prerecorded) | N/A |
| 1.3.4 | Orientation | ✅ |
| 1.3.5 | Identify Input Purpose | ❌ |
| 1.4.3 | Contrast (Minimum) | ❌ |
| 1.4.4 | Resize Text | ✅ |
| 1.4.5 | Images of Text | ✅ |
| 1.4.10 | Reflow | ⚠️ (verificar responsive) |
| 1.4.11 | Non-text Contrast | ❌ |
| 1.4.12 | Text Spacing | ⚠️ |
| 1.4.13 | Content on Hover or Focus | ❌ |
| 2.4.5 | Multiple Ways | ❌ |
| 2.4.6 | Headings and Labels | ❌ |
| 2.4.7 | Focus Visible | ❌ |
| 2.4.11 | Focus Not Obscured (AA) | ⚠️ |
| 3.1.2 | Language of Parts | ✅ |
| 3.2.3 | Consistent Navigation | ✅ |
| 3.2.4 | Consistent Identification | ✅ |
| 3.3.3 | Error Suggestion | ❌ |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | ❌ |
| 4.1.3 | Status Messages | ❌ |

---

## Bugs de accesibilidad concretos (priorizados)

| # | Prioridad | Bug | Criterio WCAG | Archivo | Línea |
|---|-----------|-----|---------------|---------|-------|
| 1 | 🔴 Crítico | LogoutButton ignora la prop `label` — siempre renderiza "Logout" en inglés sin importar el locale | 4.1.2 | `layout.tsx:35` / `logout-button.tsx` | 35 / 1 |
| 2 | 🔴 Crítico | Inputs de login sin `<label>`, solo placeholder | 1.3.1, 3.3.2 | `auth/signin/page.tsx` | 19-32 |
| 3 | 🔴 Crítico | Inputs de signup sin `<label>`, solo placeholder | 1.3.1, 3.3.2 | `auth/signup/page.tsx` | 51-74 |
| 4 | 🔴 Crítico | Sin título de página (`<title>`) en ninguna página | 2.4.2 | Todas las pages | — |
| 5 | 🔴 Crítico | Sin Skip to Content | 2.4.1 | `layout.tsx` | — |
| 6 | 🟡 Alto | Sin foco visible en elementos interactivos | 2.4.7 | Todos los componentes | — |
| 7 | 🟡 Alto | `<Link>` anidando `<button>` — dos elementos focusables | 2.4.3, 4.1.2 | `page.tsx` | 37-41 |
| 8 | 🟡 Alto | Contraste insuficiente: `#888` sobre `#fff` | 1.4.3 | `products/[id]/page.tsx:33`, `page.tsx:36` | 33, 36 |
| 9 | 🟡 Alto | Contraste insuficiente: `#ff4d4f` sobre `#fff` | 1.4.3 | `logout-button.tsx:12` | 12 |
| 10 | 🟡 Alto | Language selector sin `aria-label` y cambia contexto al instante | 3.2.2, 4.1.2 | `language-selector.tsx` | 15 |
| 11 | 🟡 Alto | Error en signup solo con color, sin `role="alert"` | 1.4.1, 4.1.3 | `auth/signup/page.tsx` | 47-49 |
| 12 | 🟡 Alto | Varios "View Details" sin diferenciar | 2.4.4 | `page.tsx` | 37-41 |
| 13 | 🟡 Medio | Product Image Placeholder sin `role="img"` ni `aria-label` | 1.1.1 | `products/[id]/page.tsx` | 27 |
| 14 | 🟡 Medio | Encabezados incorrectos: Login/Signup/Checkout usan `<h2>` en vez de `<h1>` | 2.4.6 | Varios | — |
| 15 | 🟡 Medio | Login/Signup inputs sin `aria-invalid` ni `aria-describedby` en errores | 3.3.1 | `auth/signup/page.tsx` | — |
| 16 | 🟡 Medio | Checkout sin confirmación — riesgo de error financiero | 3.3.4 | `checkout/page.tsx` | 42-53 |
| 17 | 🟡 Bajo | Seller name usa `#888` — subir a `#595959` | 1.4.3 | `page.tsx:36` | 36 |
| 18 | 🟡 Bajo | Placeholder de imagen usa gris ilegible (`#ccc`) | 1.4.3 | `products/[id]/page.tsx:27` | 27 |

---

## Plan de remediación — Quick Wins

| # | Acción | Criterio | Esfuerzo |
|---|--------|----------|----------|
| 1 | Agregar `<title>` con `metadata` export a todas las pages | 2.4.2 (A) | ⏱️ 15 min |
| 2 | Arreglar LogoutButton para que use la prop `label` | 4.1.2 (A) | ⏱️ 5 min |
| 3 | Agregar `<label htmlFor>` a todos los inputs de login y signup | 1.3.1, 3.3.2 (A) | ⏱️ 20 min |
| 4 | Agregar `:focus-visible` global | 2.4.7 (AA) | ⏱️ 5 min |
| 5 | Agregar Skip to Content link | 2.4.1 (A) | ⏱️ 10 min |
| 6 | Agregar `role="alert"` a mensajes de error | 4.1.3 (A) | ⏱️ 10 min |
| 7 | Agregar `aria-label` al Language selector | 4.1.2 (A) | ⏱️ 5 min |
| 8 | Corregir contraste `#888` → `#595959` y `#ff4d4f` → `#cf1322` | 1.4.3 (AA) | ⏱️ 10 min |
| 9 | Corregir heading levels (login/signup/checkout → `<h1>`) | 2.4.6 (AA) | ⏱️ 10 min |
| 10 | Separar `<Link>` y `<button>` en cards de productos | 2.4.3 (A) | ⏱️ 15 min |

---

## Dependencias sugeridas

```json
{
  "devDependencies": {
    "eslint-plugin-jsx-a11y": "^6.x",
    "axe-core": "^4.x",
    "@axe-core/react": "^4.x"
  }
}
```

- `eslint-plugin-jsx-a11y` — linting automático de accesibilidad
- `axe-core` + `@axe-core/react` — auditoría en tiempo de desarrollo (React dev)

---

## Integración en CI (a posteriori)

GitHub Actions se agregará después. Cuando esté configurado, se incluirán:

```yaml
# .github/workflows/test.yml (futuro)
name: Tests
on: [pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: testdb
        ports:
          - 5433:5432
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisma generate && npx prisma db push
      - run: npx playwright install --with-deps
      - run: npm run dev & npx wait-on http://localhost:3000
      - run: npm run test:e2e
```

Los tests de accesibilidad con `jest-axe` corren dentro de `npm test` (Vitest), no requieren CI adicional.

---

## Estrategia de tests

### Stack

| Nivel | Herramienta | Se testea |
|-------|------------|-----------|
| **Unit** | Vitest | Lógica de negocio, use cases, helpers, validaciones |
| **UX + Accesibilidad** | Vitest + Testing Library | Comportamiento visible, roles ARIA, contraste semántico |
| **E2E** | Playwright | Flujos críticos: login, carrito, compra, seguridad |
| **Static** | ESLint + `eslint-plugin-jsx-a11y` | Reglas automáticas de accesibilidad en JSX |

### Principios

1. **Evitar mocks**. Preferir **implementaciones en memoria** (repositorios fake). El proyecto ya tiene `MemoryUserRepository`, `MemoryOrderRepository`, `MemoryProductRepository`, `MemoryOutboxRepository` — usar esos en vez de `vi.mock()`.
2. Probar **comportamiento, no implementación**. No importa cómo se hace internamente, importa qué devuelve y cómo se comporta ante el usuario.
3. NO probar: interfaces TypeScript, constantes estáticas, configuración de Zod, tipados.
4. Los tests son **documentación ejecutable** de lo que el sistema hace.

---

### Vitest — Unit tests

#### Qué testear

| Sí testear | NO testear |
|-----------|------------|
| Use cases (casos de uso) | Interfaces TypeScript |
| Validaciones de negocio | Constantes estáticas (`SALE_STATUS`) |
| Reglas de dominio (precio ≥ 0, stock > 0) | Schemas de Zod (confiar en que Zod valida) |
| Flujos de error y edge cases | Tipos y genéricos |
| Repositorios en memoria + outbox fake | Configuración de librerías |
| Transformaciones de datos | |

#### Patrón actual (correcto, mantener)

```typescript
// ✅ Así se hace actualmente — sin mocks, con repositorios en memoria
describe('RegisterUserUseCase', () => {
  let userRepo: MemoryUserRepository;
  let outboxRepo: MemoryOutboxRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepo = new MemoryUserRepository();
    outboxRepo = new MemoryOutboxRepository();
    useCase = new RegisterUserUseCase(userRepo, outboxRepo);
  });

  it('should register a new user', async () => {
    const result = await useCase.execute({ email: 'test@e.com', name: 'Test', passwordHash: 'hash' });
    expect(result.email).toBe('test@e.com');
    expect(outboxRepo.events).toHaveLength(1);
  });
});
```

#### Lo que NO se debe hacer

```typescript
// ❌ NO: mockear el repositorio
vi.mock('../infrastructure/prisma-user-repository');
const mockRepo = { save: vi.fn() };

// ❌ NO: mockear Prisma directamente
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn() }));
```

Si un use case necesita un repositorio, se pasa una implementación en memoria. Si no hay implementación en memoria, se crea una — es más mantenible que un mock.

---

### Testing Library — UX y Accesibilidad

Los tests con Testing Library verifican que el usuario **ve y puede operar** la interfaz. Son la herramienta principal para asegurar WCAG.

#### Configuración

```typescript
// vitest.config.ts ya tiene jsdom ✅
// Solo falta instalar:
// npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

```typescript
// src/test-setup.ts (agregar a vitest.config.ts > setupFiles)
import '@testing-library/jest-dom';
```

#### Qué testear con Testing Library

| Test | Criterio WCAG |
|------|---------------|
| ¿El botón tiene el texto esperado? | 4.1.2 Name, Role, Value |
| ¿El input tiene un `<label>` vinculado? | 1.3.1 Info and Relationships |
| ¿El mensaje de error tiene `role="alert"`? | 4.1.3 Status Messages |
| ¿Se puede navegar todo con teclado? | 2.1.1 Keyboard |
| ¿El link `aria-label` es descriptivo? | 2.4.4 Link Purpose |
| ¿Skip to content es el primer tab stop? | 2.4.1 Bypass Blocks |
| ¿El heading `<h1>` describe la página? | 2.4.6 Headings and Labels |

#### Patrón

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInPage from './page';

describe('SignInPage (a11y)', () => {
  it('tiene labels vinculados a los inputs', () => {
    render(<SignInPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('el botón de submit tiene texto descriptivo', () => {
    render(<SignInPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('se puede completar el form solo con teclado', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);
    await user.tab();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
  });
});
```

#### A11y automático con axe-core

```typescript
// tests/a11y/all-pages.test.ts
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('HomePage a11y', () => {
  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### Configuración adicional

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "jest-axe": "^9.x"
  }
}
```

---

### Playwright — E2E de flujos críticos

Playwright es para **flujos reales completos** contra el backend real (o un entorno de test). NO para unit tests ni lógica aislada.

#### Flujos a testear (priorizados)

| # | Flujo | Por qué es crítico |
|---|-------|-------------------|
| 1 | **Registro → Login → Logout** | Ciclo de vida de sesión completo |
| 2 | **Login fallido (credenciales inválidas)** | Seguridad, rate limiting |
| 3 | **Navegar productos → Ver detalle** | Ruta principal del catálogo |
| 4 | **Añadir al carrito → Checkout → PayPal** | Flujo de compra completo |
| 5 | **Forzar URL protegida sin sesión** | Control de acceso (redirección a login) |
| 6 | **Forzar URL de admin como cliente** | Autorización por rol |
| 7 | **Cambio de idioma (es ↔ cat)** | i18n, textos traducidos |
| 8 | **Inyección en formularios (XSS básico)** | Seguridad |

#### Estructura

```plaintext
e2e/
├── auth/
│   ├── register.spec.ts
│   ├── login.spec.ts
│   └── logout.spec.ts
├── shop/
│   ├── browse-products.spec.ts
│   ├── product-detail.spec.ts
│   └── checkout.spec.ts
├── security/
│   ├── access-control.spec.ts
│   ├── rate-limiting.spec.ts
│   └── xss.spec.ts
├── i18n/
│   └── language-switch.spec.ts
└── playwright.config.ts
```

#### Patrón

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test('login exitoso redirige a home con nombre de usuario', async ({ page }) => {
  await page.goto('/es/auth/signin');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'correct-password');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Hola, Test User')).toBeVisible();
  await expect(page).toHaveURL(/\/es$/);
});

test('login fallido muestra error', async ({ page }) => {
  await page.goto('/es/auth/signin');
  await page.fill('input[name="email"]', 'wrong@example.com');
  await page.fill('input[name="password"]', 'wrong-password');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Credenciales inválidas')).toBeVisible();
});

test('ruta protegida redirige a login sin sesión', async ({ page }) => {
  await page.goto('/es/checkout?productId=abc');
  await expect(page).toHaveURL(/\/es\/auth\/signin/);
});
```

#### Entorno local con Docker

Los tests de Playwright se ejecutan contra el stack completo levantado con Docker, no contra `npm run dev`.

```yaml
# docker-compose.yml (ya existe — agregar servicio de app si no está)
services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpassword
      POSTGRES_DB: testdb
    ports:
      - '5433:5432'
    volumes:
      - db_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://testuser:testpassword@db:5432/testdb?schema=public
      NEXTAUTH_SECRET: test-secret-for-e2e
      NEXTAUTH_URL: http://localhost:3000
    depends_on:
      - db
```

```typescript
// e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'es-ES',
  },
  // No webServer — el stack se levanta con docker compose aparte
  // Ver abajo el flujo de ejecución local
});
```

```json
{
  "devDependencies": {
    "@playwright/test": "^1.x"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  }
}
```

#### Flujo de ejecución local

```bash
# 1. Levantar stack completo (app + db)
npm run docker:up

# 2. Esperar a que app esté lista
#    (opcional: docker compose logs -f app para ver el startup)

# 3. Ejecutar tests
npm run test:e2e

# 4. Bajar stack
npm run docker:down
```

#### Seed de datos para E2E

Los tests E2E necesitan datos predecibles. Crear un script de seed específico para E2E:

```bash
# docker-compose.yml podría tener un servicio seed:
  seed:
    build: .
    command: npx prisma db seed
    environment:
      DATABASE_URL: postgresql://testuser:testpassword@db:5432/testdb?schema=public
    depends_on:
      - db
```

O ejectuar seed como paso manual antes de los tests:

```bash
# En el setup de Playwright (globalSetup), se conecta a la DB y siembra datos
```

#### GitHub Actions (a posteriori)

Se agregará cuando el proyecto esté en GitHub. Pendiente:

- Cache de dependencias y de Playwright browsers
- Servicio PostgreSQL en container de GH Actions
- Seed de datos para E2E
- Ejecución paralela de tests con sharding

---

### Resumen de configuración final

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "jest-axe": "^9.x",
    "@playwright/test": "^1.x",
    "eslint-plugin-jsx-a11y": "^6.x"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:a11y": "vitest run --testPathPattern='a11y'",
    "lint": "next lint"
  }
}
```

### Árbol completo de tests esperado

```plaintext
tests/
├── unit/                     # Vitest — lógica de negocio
│   ├── register-user.use-case.test.ts
│   ├── create-order.use-case.test.ts
│   └── ...
├── ux/                       # Vitest + Testing Library — UX y a11y
│   ├── signin.page.test.tsx
│   ├── signup.page.test.tsx
│   ├── checkout.page.test.tsx
│   ├── logout-button.test.tsx
│   ├── language-selector.test.tsx
│   └── a11y/
│       ├── home-page.test.tsx     # axe-core scan
│       └── product-detail.test.tsx
└── e2e/                      # Playwright — flujos completos
    ├── auth/
    ├── shop/
    ├── security/
    └── i18n/
```

Los tests existentes en `modules/*/application/*.test.ts` pueden quedarse ahí o migrarse a `tests/unit/` — lo importante es mantener el patrón de repositorios en memoria sin mocks.

---

*Documento basado en revisión manual de componentes frontend existentes. Los criterios N/A se omitieron por no aplicar al tipo de aplicación (sin contenido multimedia, sin audio, etc.).*
