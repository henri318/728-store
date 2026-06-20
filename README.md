# 728-store

E-commerce de artículos personalizados (camisetas, sudaderas, tazas...) con soporte multi-vendedor.

Arquitectura de módulo monolítico: cada dominio (usuarios, pedidos, productos...) vive aislado en sus capas internas, pero todo comparte una base de datos y un bus de eventos interno. Sin atajos entre módulos — la comunicación pasa por eventos de dominio o interfaces compartidas.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, lucide-react |
| Lenguaje | TypeScript 6 |
| Base de datos | PostgreSQL 15 (Alpine) |
| ORM | Prisma 7 |
| Autenticación | NextAuth.js 4 (JWT + credentials + Google) |
| Validación | Zod 4 |
| Email transaccional | Brevo (ex-Sendinblue) |
| Hashing de passwords | bcrypt (cost 12) |
| Testing | Vitest 4 + Testing Library + jest-axe + Playwright |
| Linting | ESLint 10 + typescript-eslint |
| Infra local | Docker (solo PostgreSQL) |

**No usamos Redis** — todas las colas (email, outbox, rate limiting) son Prisma-based.

---

## Instalación y ejecución

### Requisitos previos

- [Node.js](https://nodejs.org/) >= 18
- [Docker](https://www.docker.com/) (solo para PostgreSQL)
- npm o pnpm

### Primeros pasos

```bash
# 1. Clonar el repo
git clone https://github.com/henri318/728-store.git
cd 728-store

# 2. Setup completo (instala deps, levanta DB, crea tablas, puebla datos)
npm run setup

# 3. Arrancar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — deberías ver la tienda.

### Comandos útiles del día a día

```bash
# Base de datos
npm run db:studio        # Abrir Prisma Studio (GUI para ver/editar datos)
npm run db:migrate       # Crear migración cuando cambias el schema
npm run db:reset         # Reset completo: borra datos, re-migra, re-seed
npm run db:down          # Parar PostgreSQL

# Desarrollo
npm run dev              # Servidor de desarrollo con hot reload

# Calidad
npm run test             # Tests en modo watch
npm run test:run         # Tests una vez (para CI)
npm run lint             # Linting
npm run typecheck        # Verificar tipos sin emitir archivos
npm run build            # Build de producción (verifica que todo compila)

# E2E Tests
npm run test:e2e         # Tests E2E contra app local (requiere db:up + dev corriendo)
npm run test:e2e:ui      # Abrir interfaz gráfica de Playwright
npm run test:e2e:debug   # Ejecutar en modo debug (paso a paso)
npm run test:e2e:docker  # Tests E2E en Docker (app + DB, todo autocontenido)
```

---

## Tests E2E

### Requisitos

- Docker corriendo
- Node.js >= 18

### Opción 1: Docker completo (recomendado para CI)

```bash
# Ejecuta PostgreSQL + App + Tests en un solo comando
npm run test:e2e:docker
```

### Opción 2: Local (desarrollo)

```bash
# Terminal 1: Levantar base de datos
npm run db:up

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

| Archivo | Qué prueba |
|---------|-----------|
| `000-health-check.spec.ts` | Health check del servidor |
| `home/home.spec.ts` | Página principal, grid de productos, navegación |
| `auth/sign-up.spec.ts` | Registro de usuario |
| `auth/sign-in.spec.ts` | Login y credenciales |
| `auth/navigation.spec.ts` | Links entre páginas de auth |
| `products/products.spec.ts` | Listado de productos, precios, cambio de idioma |

---

## Estructura del proyecto

```
728-store/
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
│   └── tickets/                # Tickets de soporte (parcial)
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
│   ├── unit/                   # Tests unitarios (~34 archivos)
│   ├── e2e/                    # Tests E2E con Playwright
│   │   ├── health/             # Smoke tests
│   │   ├── auth/               # Registro, login, navegación
│   │   ├── home/               # Página principal
│   │   └── products/           # Productos
├── prisma/                     # Schema + seed
├── docs/                       # Documentación de arquitectura (21 archivos)
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

| Módulo | Qué hace |
|--------|----------|
| **Auth** | Login con credenciales + Google, registro, verificación de email, rate limiting (5 intentos/email/15min, 20 intentos/IP/15min) |
| **Usuarios** | CRUD completo, borrado suave (soft delete), asignación de roles |
| **Productos** | Catálogo con traducciones (es/cat), personalización de productos, listado y detalle |
| **Pedidos** | Crear pedido, marcar como pagado, asignar a producción, outbox transaccional |
| **Roles** | RBAC con 4 roles: ADMIN, SUPPORT, DESIGNER, CUSTOMER |
| **Email** | Cola transaccional con Brevo, worker con retry exponencial, fallback a consola en desarrollo |
| **Eventos** | Bus de eventos in-memory, patrón outbox para fiabilidad |

### Eventos de dominio definidos

El sistema usa eventos para comunicación entre módulos:

- **Productos**: `ProductCustomizationCreated`
- **Pedidos**: `OrderCreated`, `OrderPaid`, `OrderReadyForProduction`
- **Pagos**: `PaymentInitialized`, `PaymentVerified`, `PaymentCompleted`
- **Tickets**: `TicketCreated`, `MessageAdded`, `TicketUpdated`, `TicketClosed`
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

## Más información

- [Arquitectura](docs/architecture.md) — Reglas y principios del módulo
- [Estructura de carpetas](docs/folder-structure.md) — Detalle del layout
- [Modelo de entidades](docs/entities.md) — Entidades, relaciones y value objects
- [Bus de eventos](docs/event-bus.md) — Diseño del sistema de eventos
- [Eventos](docs/event.md) — Catálogo completo de eventos
- [Seguridad](docs/security-gaps.md) — Auditoría de seguridad
- [Accesibilidad](docs/accessibility-aa.md) — Auditoría WCAG 2.2
- [SEO](docs/seo-analytics.md) — Estrategia SEO
