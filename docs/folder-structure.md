# Folder Structure

# Project Structure

```plaintext
/app
  /(routes)                     ← Next.js app router (orchestration only)
  /api
    /auth
      /[...nextauth]            ← NextAuth handler (uses PrismaUserRepository)
      /signup                   ← Register user + enqueue verification email
      /verify-email             ← Email verification callback
      /resend-verification      ← Resend verification email
    /orders                     ← Order endpoints (role-guarded)

/modules                        ← independent domain modules
  /orders
    /domain                     ← OrderEntity, OrderRepository, ports
    /application                ← Use cases (CreateOrder, MarkAsPaid, ...)
    /infrastructure             ← PrismaOrderRepository, adapter bridges
    (no /presentation — orders is served from /app)

  /products
    /domain                     ← ProductEntity, ProductRepository
    /application                ← GetProducts, GetProductById
    /infrastructure             ← PrismaProductRepository, Memory*Repository

  /users
    /domain
    /application
    /infrastructure

  /auth
    /application                ← Login (currently tested only)
    (auth is wired through NextAuth, no /infrastructure needed)

  /sellers
  /payments
  /uploads
  /ai
  /tickets
  /roles

/shared
  /kernel                       ← PURE — no Prisma, no SDKs, no env-only code
    outbox-repository.ts        ← port
    email-sender.ts             ← port
    app-error.ts                ← AppError + subclasses
    error-handler.ts            ← Next.js API error mapping
    event-bus.ts                ← in-memory pub/sub
    container.ts                ← composition root

  /infrastructure               ← Prisma, SDKs, env-only code
    prisma.ts
    prisma-outbox-repository.ts
    outbox-service.ts
    outbox-worker.ts
    authorization.ts
    password-hasher.ts
    rate-limiter.ts
    url.ts
    email.ts                    ← Brevo client + escapeHtml
    brevo-email-sender.ts
    console-email-sender.ts
    roles.ts

  /events                       ← GlobalEvents registry + helpers
  /i18n                         ← locale dictionaries
  /presentation                 ← shared React components
  /validation                   ← Zod schemas (auth, orders, ...)

/tests
  /doubles                      ← in-memory test doubles (test-only imports)
  /unit
  /e2e
  /ux
  setup.ts

/workers                        ← background processes
  email-worker.ts               ← polls prisma.emailQueue, dispatches via EmailSender

/prisma                         ← schema.prisma, migrations, seed.ts
```

# Rules

1. **A module never imports another module directly.** Cross-module data
   flows through ports that the consuming module defines; the producing
   module's infrastructure provides the adapter.

2. **`shared/kernel` is dependency-free.** It contains only ports, errors,
   the event bus, and the composition root. No Prisma, no NextAuth, no
   Brevo, no bcrypt.

3. **`shared/infrastructure` is the only place outside `container.ts` that
   knows about concrete libraries.** The rest of the codebase talks to ports.

4. **`tests/doubles` is test-only.** Production code is not allowed to
   import from it — it would defeat the purpose of the port.

5. **`app/` is orchestration only.** No business logic lives here — every
   route constructs the appropriate use case with its dependencies and
   forwards the result.
