# 728Studio

E-commerce de artículos personalizados (camisetas, sudaderas, tazas...) con soporte multi-vendedor.

Arquitectura de módulo monolítico: cada dominio (usuarios, pedidos, productos...) vive aislado en sus capas internas, pero todo comparte una base de datos y un bus de eventos interno. La comunicación pasa por eventos de dominio o interfaces compartidas.

---

## Demo y entrega

| Recurso               | Acceso                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Aplicación desplegada | [https://728studio.vercel.app/](https://728studio.vercel.app/)                                                                        |
| Repositorio           | [github.com/henri318/728-store](https://github.com/henri318/728-store)                                                                |
| Presentación          | [slides](https://new.express.adobe.com/publishedV2/urn:aaid:sc:US:b961d0a7-e4be-5ef5-a33f-5fc0a7b8a47e?sdid=C4SZ2FYJ&category=search) |     |
| Vídeo de presentación | [video]()                                                                                                                             |

---

## Stack tecnológico

| Capa                 | Tecnología                                 |
| -------------------- | ------------------------------------------ |
| Framework            | Next.js 16 (App Router, Turbopack)         |
| UI                   | React 19, lucide-react                     |
| Lenguaje             | TypeScript 6                               |
| Base de datos        | PostgreSQL 18                              |
| ORM                  | Prisma 7                                   |
| Autenticación        | NextAuth.js 4 (JWT + credentials + Google) |
| Validación           | Zod 4                                      |
| Email transaccional  | Brevo (ex-Sendinblue)                      |
| Hashing de passwords | bcrypt (cost 12)                           |
| Testing              | Vitest 4 + Testing Library + Playwright    |
| Linting              | ESLint 10 + typescript-eslint              |
| Infra local          | Docker (PostgreSQL + nginx para assets)    |

---

## Instalación y ejecución

### Requisitos previos

- [Node.js](https://nodejs.org/) >= 24
- [Docker](https://www.docker.com/) (PostgreSQL, assets locales y E2E)
- npm

### Primeros pasos

```bash
# 1. Clonar el repo
git clone https://github.com/henri318/728-store.git
cd 728-store

# 2. Crear la configuración local
cp .env.example .env

# 3. Setup completo (instala deps, levanta DB, crea tablas, puebla datos)
npm run setup

# 4. Arrancar el servidor de desarrollo
npm run dev
```

En PowerShell, usa `Copy-Item .env.example .env` en lugar de `cp`. Antes de
ejecutar el setup, revisa los valores del archivo `.env`; Prisma necesita que
`DATABASE_URL` esté definida.

Abre [http://localhost:3000](http://localhost:3000) — deberías ver la tienda.

### Scripts npm

#### Desarrollo y despliegue

| Comando                 | Uso                                                                   |
| ----------------------- | --------------------------------------------------------------------- |
| `npm run setup`         | Instala dependencias, levanta servicios, sincroniza y puebla la DB.   |
| `npm run dev`           | Inicia Next.js; presupone que los servicios locales ya están activos. |
| `npm run dev:full`      | Levanta PostgreSQL y assets, y después inicia Next.js.                |
| `npm run dev:env`       | Levanta únicamente PostgreSQL y el servidor local de assets.          |
| `npm run dev:down`      | Detiene los servicios Docker de desarrollo.                           |
| `npm run build`         | Genera el build de producción de Next.js.                             |
| `npm run build:analyze` | Abre el analizador experimental de bundles de Next.js.                |
| `npm run start`         | Sirve un build de producción; lo usan Playwright y Docker E2E.        |
| `npm run deploy`        | Build Command de Vercel: aplica migraciones y genera el build.        |

#### Calidad

| Comando                | Uso                                               |
| ---------------------- | ------------------------------------------------- |
| `npm run lint`         | Comprueba ESLint en todo el repositorio.          |
| `npm run lint:fix`     | Aplica correcciones automáticas de ESLint.        |
| `npm run format`       | Formatea archivos con Prettier.                   |
| `npm run format:check` | Comprueba formato sin modificar archivos; usa CI. |
| `npm run typecheck`    | Comprueba TypeScript sin emitir archivos.         |

#### Tests

| Comando                    | Uso                                                       |
| -------------------------- | --------------------------------------------------------- |
| `npm test`                 | Ejecuta Vitest en modo watch.                             |
| `npm run test:run`         | Ejecuta todos los tests unitarios una vez; usa CI.        |
| `npm run test:unit:jsdom`  | Ejecuta únicamente los tests React en jsdom.              |
| `npm run test:integration` | Ejecuta secuencialmente los tests contra PostgreSQL.      |
| `npm run test:e2e`         | Ejecuta Playwright contra una aplicación existente.       |
| `npm run test:e2e:ui`      | Abre la interfaz interactiva de Playwright.               |
| `npm run test:e2e:debug`   | Ejecuta Playwright con el inspector paso a paso.          |
| `npm run test:e2e:docker`  | Ejecuta el entorno E2E autocontenido y después lo limpia. |

#### Base de datos

| Comando              | Uso                                                                 |
| -------------------- | ------------------------------------------------------------------- |
| `npm run db:migrate` | Crea/aplica migraciones de desarrollo y regenera Prisma Client.     |
| `npm run db:reset`   | Borra la DB, reaplica migraciones, regenera el cliente y la puebla. |
| `npm run db:push`    | Sincroniza el schema sin migración y regenera Prisma Client.        |
| `npm run db:seed`    | Ejecuta el seed configurado en `prisma.config.ts`.                  |
| `npm run db:studio`  | Abre Prisma Studio.                                                 |

`postinstall` regenera Prisma Client y `prepare` instala los hooks de Husky;
ambos se ejecutan automáticamente durante la instalación.

---

## Tests E2E

### Requisitos

- Docker corriendo
- Node.js >= 24

### Opción 1: Docker completo (entorno autocontenido)

```bash
# Ejecuta PostgreSQL + App + Tests en un solo comando
npm run test:e2e:docker
```

Este comando valida localmente el stack completo. El workflow de CI ejecuta
Playwright directamente, sin levantar la aplicación mediante Docker Compose.
La aplicación Docker usa el puerto `3100` para no competir con el servidor local.
Si Playwright falla fuera de CI, el reporte HTML se abre automáticamente después
de limpiar los contenedores y volúmenes.

### Opción 2: Local (desarrollo)

```bash
# Terminal 1: Levantar PostgreSQL y assets locales
npm run dev:env

# Terminal 2: Preparar DB y arrancar app
npm run db:push && npm run db:seed && npm run dev

# Terminal 3: Ejecutar tests
npm run test:e2e
```

### Debugging

```bash
# Abrir interfaz gráfica de Playwright
npm run test:e2e:ui

# Ejecutar paso a paso con inspector
npm run test:e2e:debug
```

### Tests disponibles

| Archivo                         | Qué prueba                                                   |
| ------------------------------- | ------------------------------------------------------------ |
| `000-health-check.spec.ts`      | Health check del servidor                                    |
| `home/home.spec.ts`             | Página principal, catálogo y navegación                      |
| `products/products.spec.ts`     | Listado de productos, precios y cambio de idioma             |
| `personalization-flow.spec.ts`  | Personalización de productos                                 |
| `checkout-orders.spec.ts`       | Carrito, checkout y creación de pedidos                      |
| `auth/sign-up.spec.ts`          | Registro de usuario                                          |
| `auth/sign-in.spec.ts`          | Login con credenciales                                       |
| `auth/navigation.spec.ts`       | Navegación entre las páginas de autenticación                |
| `auth/profile.spec.ts`          | Consulta y actualización del perfil                          |
| `auth/change-password.spec.ts`  | Cambio de contraseña                                         |
| `auth/delete-account.spec.ts`   | Eliminación de cuenta                                        |
| `profile/address-guard.spec.ts` | Validación de la dirección necesaria para comprar            |
| `admin/access.spec.ts`          | Acceso autorizado a las áreas de administración              |
| `admin/denial.spec.ts`          | Denegación de acceso administrativo según el rol del usuario |

---

## Estructura del proyecto

```
728Studio/
├── app/                        # Next.js App Router (rutas y API)
│   ├── [locale]/               # i18n: /es/..., /cat/...
│   │   ├── page.tsx            # Home — grid de productos
│   │   ├── auth/               # Login, registro
│   │   ├── checkout/           # Flujo de compra
│   │   └── products/[id]/      # Detalle de producto
│   └── api/                    # Endpoints REST
│       ├── auth/               # NextAuth + registro + verificación email
│       └── orders/             # Crear pedido
│
├── modules/                    # Módulos de negocio (DDD-lite)
│   ├── auth/                   # Autenticación y sesiones
│   ├── users/                  # Gestión de usuarios
│   ├── products/               # Catálogo y personalización
│   ├── orders/                 # Pedidos
│   ├── payments/               # Pagos (PayPal, planificado)
│   ├── roles/                  # RBAC (ADMIN, SUPPORT, DESIGNER, CUSTOMER)
│   ├── email/                  # Cola de email transaccional
│   ├── events/                 # Bus de eventos interno
│   ├── cart/                   # Carrito de compra
│   ├── customizations/         # Personalización de productos
│   ├── sellers/                # Gestión de vendedores
│   ├── uploads/                # Subida de archivos
│   ├── search-history/         # Historial de búsqueda
│
├── shared/                     # Cortes transversales
│   ├── authorization/          # Middleware de roles
│   ├── i18n/                   # Diccionarios (es, cat)
│   ├── infrastructure/         # Prisma client, auth options
│   ├── kernel/                 # Ports, value objects (EntityId, Money, Email...)
│   └── presentation/           # Componentes compartidos, error handler
│
├── composition-root/           # Contenedor DI — aqui se ensamblan todo
├── workers/                    # Workers background (email, outbox)
├── tests/                      # Suite de tests
│   ├── doubles/                # Implementaciones in-memory para testing
│   ├── unit/                   # Tests unitarios y de componentes
│   ├── e2e/                    # Tests E2E con Playwright
│   │   ├── admin/              # Acceso y autorización administrativa
│   │   ├── auth/               # Registro, login, navegación
│   │   ├── home/               # Página principal
│   │   ├── products/           # Productos
│   │   ├── profile/            # Perfil y dirección de entrega
│   │   └── *.spec.ts           # Health, personalización y checkout
├── prisma/                     # Schema + seed
├── docs/                       # Documentación de arquitectura y módulos
├── docker-compose.yml          # PostgreSQL (desarrollo)
├── docker-compose.e2e.yml      # PostgreSQL + App (tests E2E)
├── playwright.config.ts        # Configuración de Playwright
└── .github/workflows/e2e.yml   # CI: tests E2E en PRs
```

### Capas por módulo

Cada módulo sigue la misma estructura interna:

```
modulo/
├── domain/         # Entidades, value objects, puertos (interfaces)
├── application/    # Casos de uso
├── infrastructure/ # Adaptadores concretos (Prisma, Brevo, bcrypt...)
└── presentation/   # Schemas Zod, componentes UI
```

---

## Funcionalidades

### Implementadas

| Módulo              | Qué hace                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**            | Login con credenciales + Google, registro, verificación de email, rate limiting (5 intentos/email/15min, 20 intentos/IP/15min) |
| **Usuarios**        | CRUD completo, borrado suave (soft delete), asignación de roles                                                                |
| **Productos**       | Catálogo con traducciones (es/cat), personalización de productos, listado y detalle                                            |
| **Pedidos**         | Crear pedido, marcar como pagado, asignar a producción, outbox transaccional                                                   |
| **Roles**           | RBAC con 4 roles: ADMIN, SUPPORT, DESIGNER, CUSTOMER                                                                           |
| **Email**           | Cola transaccional con Brevo, worker con retry exponencial, fallback a consola en desarrollo                                   |
| **Eventos**         | Bus de eventos in-memory, patrón outbox para fiabilidad                                                                        |
| **Carrito**         | Carrito persistente, migración al iniciar sesión, checkout multi-vendedor, envío y descuento de primera compra                 |
| **Personalización** | Diseños con texto, color, talla, imágenes y posición visual que se conservan durante el checkout                               |
| **Vendedores**      | Alta, consulta, edición, cambio de estado y catálogo de productos por vendedor                                                 |
| **Uploads**         | Subidas públicas y privadas, URLs firmadas, confirmación, eliminación y limpieza de archivos pendientes                        |
| **Búsquedas**       | Historial de búsquedas recientes por usuario e idioma, sin términos duplicados                                                 |
| **Administración**  | Gestión protegida por roles de usuarios, vendedores, productos, categorías y pedidos                                           |

### Eventos de dominio definidos

El sistema usa eventos para comunicación entre módulos:

- **Productos**: `ProductCustomizationCreated`
- **Pedidos**: `OrderCreated`, `OrderPaid`, `OrderReadyForProduction`
- **Pagos**: `PaymentInitialized`, `PaymentVerified`, `PaymentCompleted`
- **Usuarios**: `UserRegistered`, `RoleAssigned`

---

## Arquitectura en una mirada

```
┌─────────────────────────────────────────────┐
│              presentation (UI)              │
├─────────────────────────────────────────────┤
│             application (use cases)         │
├─────────────────────────────────────────────┤
│          domain (entities + ports)          │
├─────────────────────────────────────────────┤
│       infrastructure (adapters)             │
└─────────────────────────────────────────────┘
         ↕ Composition Root (DI container)
         ↕ Event Bus (cross-module communication)
```

- **Outbox Pattern**: los eventos se persisten atómicamente con los cambios de negocio, luego un worker los despacha al bus. Sin eventos perdidos.
- **DI Container** (`composition-root/container.ts`): ensambla puertos → adaptadores. En tests, se inyectan fakes in-memory.

---

## Infraestructura

| Recurso                           | Servicio / Detalle                                                |
| --------------------------------- | ----------------------------------------------------------------- |
| **Hosting**                       | [Vercel](https://728studio.vercel.app/) (App Router + Serverless) |
| **Base de datos**                 | [Neon](https://neon.tech/) — PostgreSQL                           |
| **Assets públicos** (productos)   | Cloudflare R2 — bucket público                                    |
| **Assets privados** (clientes)    | Cloudflare R2 — bucket privado                                    |
| **Autocompletado de direcciones** | Geoapify API                                                      |
| **Autenticación social**          | Google OAuth (via NextAuth.js)                                    |

---

## Más información

- [Arquitectura](docs/architecture.md) — Reglas y principios del módulo
- [Estructura de carpetas](docs/folder-structure.md) — Detalle del layout
- [Modelo de entidades](docs/entities.md) — Entidades, relaciones y value objects
- [Bus de eventos](docs/event-bus.md) — Diseño del sistema de eventos
- [Eventos](docs/event.md) — Catálogo completo de eventos
