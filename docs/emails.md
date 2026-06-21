# Emails Transaccionales

> Sistema de emails para Modular E-commerce.
> Provider: **Brevo** (ex Sendinblue). Cola: **Prisma** (sin Redis).
> Fecha: 2026-06-14

---

## Arquitectura

```
Use Case → OutboxEvent → Worker → Resend API → Email
                ↑
         EmailQueue (Prisma)
```

No usamos Redis. La cola de emails se implementa con una tabla `EmailQueue` en Prisma y un worker Node.js que la drena periódicamente. Esto es suficiente para el volumen de un e-commerce mediano sin añadir infraestructura extra.

---

## Flujos de email

### 1. Verificación de email

**Disparador**: `RegisterUserUseCase.execute()` — después de crear el usuario.

**Flujo**:

```
1. POST /api/auth/signup
2. RegisterUserUseCase crea user con emailVerified = null
3. Se guarda evento VERIFICATION_EMAIL en OutboxEvent
4. Worker genera token JWT (expira 24h) con { sub: userId, purpose: "email-verification" }
5. Worker guarda en EmailQueue y envía a Resend
6. Email contiene link: /{locale}/auth/verify-email?token=<jwt>
7. GET /api/auth/verify-email?token=<jwt>
8. Si token válido → UPDATE user SET emailVerified = NOW()
9. Frontend redirige a /{locale}/auth/signin?verified=true
```

**Protecciones**:

- Token expira en 24h
- `purpose: "email-verification"` en el JWT para evitar reuso del token en otro contexto
- Reenviar email: máximo 1 vez cada 5 min (rate limiting por userId)

### 2. Bienvenida

**Disparador**: Cuando `user.emailVerified` pasa de `null` a `DateTime`.

**Flujo**:

```
1. Webhook o worker detecta emailVerified cambiado
2. Envía email de bienvenida con resumen de la cuenta
```

### 3. Confirmación de pedido

**Disparador**: `OrderCreated` event en OutboxEvent.

**Contenido**: Resumen del pedido, productos, precio total, estado, estimación de envío.

### 4. Cambio de estado del pedido

**Disparador**: Eventos `OrderPaid`, `OrderInProduction`, `OrderShipped`.

### 5. Reset de contraseña

**Disparador**: `POST /api/auth/forgot-password`.

**Flujo**: Similar a verificación — token JWT con `purpose: "password-reset"`, expira 1h.

### 6. Notificación de abandono de carrito (futuro)

**Disparador**: Si hay carrito (localStorage) y usuario registrado, worker revisa carritos sin checkout > 24h.

---

## Modelo de datos

```prisma
model EmailQueue {
  id          String   @id @default(cuid())
  to          String
  subject     String
  htmlBody    String
  template    String?   // opcional: "verification", "welcome", "order-confirmation", etc.
  metadata    Json?     // datos extra para el template
  status      String   @default("PENDING") // PENDING, SENT, FAILED
  error       String?
  retryCount  Int      @default(0)
  maxRetries  Int      @default(3)
  scheduledAt DateTime @default(now())
  sentAt      DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status, scheduledAt])
  @@index([createdAt])
}
```

**Estrategia de reintentos**:

- `maxRetries: 3`
- Backoff: `2^retryCount * 60` segundos (1min → 2min → 4min)
- Después del 3er fallo, el worker marca como FAILED y alerta

---

## Provider: Brevo (ex Sendinblue)

```bash
npm install @getbrevo/brevo
```

**Setup**:

```typescript
// shared/kernel/email.ts
import * as brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!,
);

export const emailClient = apiInstance;

export const FROM_EMAIL = 'Modular Ecommerce <no-reply@tudominio.com>';
export const FROM_NAME = 'Modular Ecommerce';
```

**Variables de entorno**:

```env
BREVO_API_KEY=xxxxxxxxxxxxx
EMAIL_FROM=Modular Ecommerce <no-reply@tudominio.com>
```

---

## Worker

```typescript
// workers/email-worker.ts
// Proceso separado: node workers/email-worker.ts

async function processEmailQueue() {
  const pending = await prisma.emailQueue.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  for (const email of pending) {
    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.subject = email.subject;
      sendSmtpEmail.htmlContent = email.htmlBody;
      sendSmtpEmail.sender = {
        name: FROM_NAME,
        email: 'no-reply@tudominio.com',
      };
      sendSmtpEmail.to = [{ email: email.to }];

      await emailClient.sendTransacEmail(sendSmtpEmail);
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error) {
      const newRetryCount = email.retryCount + 1;
      if (newRetryCount >= email.maxRetries) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'FAILED',
            error: String(error),
            retryCount: newRetryCount,
          },
        });
      } else {
        const backoff = Math.pow(2, newRetryCount) * 60; // segundos
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            retryCount: newRetryCount,
            error: String(error),
            scheduledAt: new Date(Date.now() + backoff * 1000),
          },
        });
      }
    }
  }
}

// Polling cada 10 segundos
setInterval(processEmailQueue, 10_000);
```

**Script en package.json**:

```json
{
  "scripts": {
    "email-worker": "node workers/email-worker.ts",
    "email-worker:dev": "tsx workers/email-worker.ts"
  }
}
```

---

## Verificación de email: login gate

**Regla**: Si un usuario intenta hacer login con email+password y su `emailVerified` es `null`, se le deniega el acceso con un error específico.

**Implementación en NextAuth authorize**:

```typescript
// app/api/auth/[...nextauth]/route.ts
async authorize(credentials) {
  // ... validar credenciales ...

  // GATE: email debe estar verificado (solo para email/password)
  if (!user.emailVerified) {
    throw new Error('EMAIL_NOT_VERIFIED');
    // Frontend captura este error y redirige a /auth/verify-email/resend
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
```

**Google OAuth**: No requiere verificación porque Google ya verifica el email. En el callback de signIn, si el usuario viene de Google, se marca automáticamente:

```typescript
// En el callback signIn de NextAuth
if (account.provider === 'google') {
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: user.emailVerified ?? new Date() },
  });
}
```

**Frontend**: La pantalla de login debe mostrar un mensaje específico si el error es `EMAIL_NOT_VERIFIED`, con un link para reenviar el email de verificación.

---

## Endpoints API

| Método | Ruta                            | Propósito                                           |
| ------ | ------------------------------- | --------------------------------------------------- |
| POST   | `/api/auth/verify-email`        | Verificar email con token JWT                       |
| POST   | `/api/auth/resend-verification` | Reenviar email de verificación (rate limit: 1/5min) |
| POST   | `/api/auth/forgot-password`     | Enviar email de reset de contraseña                 |
| POST   | `/api/auth/reset-password`      | Resetear contraseña con token                       |

---

## Resumen de dependencias

```json
{
  "dependencies": {
    "@getbrevo/brevo": "^1.x"
  }
}
```

Sin Redis, sin cola externa, sin infraestructura adicional.
