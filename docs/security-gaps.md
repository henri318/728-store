# Security Gaps & Remediation Plan

> Basado en auditoría de código del proyecto **Modular E-commerce**.
> Fecha: 2026-06-14

---

## Estado actual vs. OWASP Top 10 (2021)

| OWASP | Categoría | Estado | Gravedad |
|-------|-----------|--------|----------|
| A01 | Broken Access Control | ❌ CRÍTICO | Crítica |
| A02 | Cryptographic Failures | ❌ CRÍTICO | Crítica |
| A03 | Injection | 🟡 Bajo riesgo | Media |
| A04 | Insecure Design | ❌ Varias carencias | Alta |
| A05 | Security Misconfiguration | ❌ Múltiples | Alta |
| A06 | Vulnerable & Outdated Components | 🟡 Sin auditoría | Media |
| A07 | Identification & Auth Failures | ❌ CRÍTICO | Crítica |
| A08 | Software & Data Integrity | 🟡 No verificado | Media |
| A09 | Security Logging & Monitoring | ❌ Prácticamente nulo | Alta |
| A10 | Server-Side Request Forgery | 🟡 No hay protecciones | Baja |

---

## 1. Rate Limiting en login / signup

### Dónde está el problema

- **Login**: `app/api/auth/[...nextauth]/route.ts` — NextAuth recibe peticiones POST sin límite. Un atacante puede probar contraseñas infinitamente.
- **Signup**: `app/api/auth/signup/route.ts` — Sin rate limiting. Pueden crear cuentas masivamente.
- **Middleware**: `middleware.ts` — Solo maneja redirección de locale. No hay rate limiting global.

### Qué hay que implementar

| Acción | Prioridad |
|--------|-----------|
| Rate limiter por IP en login (máx 5 intentos/minuto) | Crítica |
| Rate limiter por email en login (máx 10 intentos/15 min) | Crítica |
| Rate limiter en signup (máx 3 cuentas/hora por IP) | Alta |
| Account lockout tras N intentos fallidos (temporario) | Alta |
| Usar `upstash-rate-limiter` o implementar con Redis/DB | Media |

### Archivos afectados

- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/signup/route.ts`
- `middleware.ts` (o crear `middleware/api-rate-limit.ts`)

### Decisión: Prisma-based (sin Redis)

Usamos una tabla `LoginAttempt` en Prisma. No Redis — el volumen de login no justifica la infraestructura extra y Prisma con índices responde en <5ms.

```prisma
model LoginAttempt {
  id        String   @id @default(cuid())
  email     String
  ipAddress String?
  success   Boolean
  createdAt DateTime @default(now())

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
}
```

**Reglas de rate limiting**:

| Límite | Ventana | Acción |
|--------|---------|--------|
| 5 fallos por email | 15 min | Bloquear email por 15 min |
| 20 fallos por IP | 15 min | Bloquear IP por 1 hora |

**Implementación**:

```typescript
// shared/kernel/rate-limiter.ts
export async function checkRateLimit(email: string, ip: string) {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60_000);

  // Por email
  const emailFails = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: fifteenMinAgo } },
  });
  if (emailFails >= 5) return { blocked: true, reason: 'email' };

  // Por IP
  const ipFails = await prisma.loginAttempt.count({
    where: { ipAddress: ip, success: false, createdAt: { gte: fifteenMinAgo } },
  });
  if (ipFails >= 20) return { blocked: true, reason: 'ip' };

  return { blocked: false };
}

export async function recordAttempt(email: string, ip: string, success: boolean) {
  await prisma.loginAttempt.create({ data: { email, ipAddress: ip, success } });
}
```

**Pruning**: Tarea programada (cron semanal) para borrar intentos mayores a 30 días.

---

## 2. Criptografía (passwords y secretos)

### Dónde está el problema

```typescript
// app/api/auth/[...nextauth]/route.ts — línea 24
if (user.passwordHash === credentials.password) {
  // ⚠️ COMPARACIÓN EN TEXTO PLANO
}

// app/api/auth/signup/route.ts — línea 19
passwordHash: password // TODO: Use bcrypt in production
// ⚠️ TODO NUNCA RESUELTO — se almacena la contraseña sin hashear
```

**Las contraseñas se almacenan y comparan en texto plano.** Esto es una vulnerabilidad crítica: cualquier acceso a la base de datos expone todas las credenciales.

### Qué hay que implementar

| Acción | Prioridad |
|--------|-----------|
| Hashear passwords con `bcrypt` (cost factor 12) en signup | **Crítica inmediata** |
| Comparar con `bcrypt.compare()` en authorize de NextAuth | **Crítica inmediata** |
| Migrar passwords existentes (forzar reset a todos los users) | Alta |
| Cambiar placeholder `NEXTAUTH_SECRET="your-secret-here"` por secreto real | Alta |
| Usar `crypto.randomUUID()` en vez de `Math.random()` para IDs | Media |

### Archivos afectados

- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/signup/route.ts`
- `modules/users/application/register-user-use-case.ts`
- `modules/users/domain/user-repository.ts`
- `.env` (rotar secreto)

### Implementación con bcrypt

```typescript
import bcrypt from 'bcrypt';

// En signup:
const salt = await bcrypt.genSalt(12);
const hashedPassword = await bcrypt.hash(password, salt);

// En login (NextAuth authorize):
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### Checklist de secretos

- [ ] `NEXTAUTH_SECRET` — generar con `openssl rand -base64 32`
- [ ] `DATABASE_URL` — usar variables de entorno reales, no default
- [ ] `.env` — agregar al `.gitignore` si no lo está (verificar)
- [ ] PayPal/API keys — no deben estar en el código

---

## 3. Gestión de roles en backend (no frontend)

### Dónde está el problema

```plaintext
modules/roles/
├── domain/          (vació)
├── application/     (vació)
├── infrastructure/  (vació)
└── presentation/    (vació)
```

**El módulo de roles está completamente vacío.** No existe un sistema de RBAC (Role-Based Access Control).

Actualmente:
- `User.role` es un `String` en Prisma con default `"user"`
- El role viaja al frontend en el token JWT de NextAuth
- **No hay guards en backend** que verifiquen roles en ninguna API
- Cualquier usuario autenticado puede crear órdenes, y potencialmente acceder a todo

### Qué hay que implementar

| Acción | Prioridad |
|--------|-----------|
| Definir roles: `user`, `seller`, `admin` (al menos) | Alta |
| Middleware de autorización por rol (`requireRole('admin')`) | Crítica |
| Verificación de ownership (ej: un seller solo ve sus productos) | Alta |
| Proteger rutas API admin (roles, gestión de usuarios) | Crítica |
| Mover lógica de role del frontend al backend | Alta |

### Arquitectura propuesta

```typescript
// shared/kernel/authorization.ts
type Role = 'user' | 'seller' | 'admin';

function requireRole(...roles: Role[]) {
  return (handler: NextApiHandler) => async (req, res) => {
    const session = await getServerSession(authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(session.user.role as Role))
      return res.status(403).json({ error: 'Forbidden' });
    return handler(req, res);
  };
}
```

### Archivos afectados

- `modules/roles/domain/` — crear entidad `Role`, permisos
- `modules/roles/application/` — use cases para asignar/verificar roles
- `modules/roles/infrastructure/` — repositorio de roles en DB
- `modules/roles/presentation/` — API routes protegidas
- `shared/kernel/authorization.ts` — guard centralizado
- `middleware.ts` — verificar rutas protegidas a nivel middleware

### Rutas que requieren protección inmediata

| Ruta | Roles permitidos | Estado |
|------|-----------------|--------|
| `POST /api/orders` | `user`, `seller` | Solo auth check ✓ |
| `POST /api/auth/signup` | público (anon) | Sin protección |
| `GET /api/admin/*` | `admin` | No existe |
| Gestión de productos | `seller`, `admin` | No verificado |
| Gestión de usuarios | `admin` | No existe |

---

## 4. Gestión de sesiones (eliminación e invalidación)

### Dónde está el problema

El proyecto usa **JWT stateless** con NextAuth:

```typescript
// app/api/auth/[...nextauth]/route.ts — línea 52
session: {
  strategy: 'jwt',
},
```

Un JWT **no se puede invalidar del lado del servidor** por diseño. Una vez emitido, el token es válido hasta que expira. Esto significa que:

- Hacer logout no invalida realmente la sesión — el JWT sigue siendo válido hasta su expiración
- Un atacante con un JWT robado puede usarlo hasta que expire
- No hay forma de "cerrar sesión remota" (ej: "cerrar sesión en todos los dispositivos")
- No hay blacklist de tokens
- No hay límite de sesiones concurrentes por usuario

### Estado actual

| Aspecto | Estado |
|---------|--------|
| Estrategia de sesión | JWT (stateless) |
| Logout del lado del servidor | ❌ No implementado |
| Blacklist de tokens | ❌ No existe |
| Rotación de JWT | ❌ No (misma sesión indefinidamente) |
| Sesiones concurrentes | ❌ Sin límite |
| Cierre de sesión remoto | ❌ No posible |
| Refresh token rotation | ❌ No implementado |
| Tiempo de expiración | Por defecto de NextAuth (30 días) |
| Secure / HttpOnly cookies | Por defecto en NextAuth ✅ |

### Qué hay que implementar

| Acción | Prioridad |
|--------|-----------|
| **Blacklist de JWT**: Tabla `invalidated_tokens` o Redis con TTL hasta la expiración original del token | **Crítica** |
| **Middleware de verificación**: Consultar blacklist en cada request autenticado | **Alta** |
| **Logout server-side**: Endpoint que agregue el JWT a la blacklist | **Alta** |
| **Reducir expiración de JWT**: De 30 días a 15-60 minutos + refresh token | **Alta** |
| **Refresh token rotation**: Implementar refresh tokens en HTTP-only cookies | **Alta** |
| **Cerrar sesión en todos los dispositivos**: Incrementar `tokenVersion` en el usuario | **Alta** |
| **Límite de sesiones concurrentes**: Máximo N sesiones activas por usuario (ej: 5) | **Media** |
| **Forzar re-login periódico**: Cada 7 días para admin, 30 para users | **Media** |

### Arquitectura propuesta

#### Blacklist de tokens

**Decisión: Prisma-based** (sin Redis). El volumen de logouts es bajo y Prisma con índice en `expiresAt` responde en <5ms.

```prisma
model InvalidatedToken {
  jti       String   @id
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([expiresAt])
}
```

```typescript
// shared/kernel/token-blacklist.ts
import { prisma } from '@/shared/infrastructure/prisma';

export class TokenBlacklist {
  async invalidate(jti: string, expiresAt: number) {
    await prisma.invalidatedToken.create({
      data: {
        jti,
        expiresAt: new Date(expiresAt),
      },
    });
  }

  async isInvalidated(jti: string): Promise<boolean> {
    const token = await prisma.invalidatedToken.findUnique({ where: { jti } });
    return token !== null;
  }
}
```

**Pruning**: La misma tarea de mantenimiento puede borrar tokens expirados semanalmente.

#### Logout endpoint

```typescript
// app/api/auth/logout/route.ts
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const jti = session.jti; // JWT ID — añadir al token en callbacks
  const expiresAt = session.exp * 1000; // Expiración del token

  await tokenBlacklist.invalidate(jti, expiresAt);

  return NextResponse.json({ success: true });
}
```

#### Cerrar sesión en todos los dispositivos

```typescript
// En el modelo User de Prisma:
// model User {
//   ...
//   tokenVersion Int @default(0)
// }

// En el callback JWT de NextAuth:
async jwt({ token, user, trigger }) {
  if (user) {
    token.tokenVersion = user.tokenVersion;
  }
  
  // Si se incrementó tokenVersion, invalidar todos los tokens anteriores
  const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });
  if (dbUser && token.tokenVersion !== dbUser.tokenVersion) {
    return null; // Forzar re-login
  }
  
  return token;
}

// Endpoint para cerrar sesión remota:
// POST /api/auth/revoke-sessions
// -> incrementa user.tokenVersion en DB
```

#### Refresh token rotation (con NextAuth)

NextAuth v4 no soporta refresh tokens nativamente. Opciones:

1. **Migrar a NextAuth v5 (Auth.js)** que tiene mejor soporte para estrategias híbridas
2. **Mantener JWT corto (15 min)** + cookie de sesión larga con re-firma automática
3. **Implementar refresh token propio** con endpoint dedicado

### Modelos de datos sugeridos

```prisma
// Agregar a schema.prisma

model InvalidatedToken {
  jti       String   @id
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([expiresAt])
}

// En User, agregar:
//   tokenVersion Int @default(0)
//   lastPasswordChange DateTime?
```

### Dependencias

```json
{
  "dependencies": {
    "@upstash/redis": "^1.x",
    "jose": "^5.x" // Necesario si se implementa refresh token sin NextAuth
  }
}
```

---

## 5. Autenticación Multifactor (MFA)

### Dónde está el problema

**No existe ningún tipo de verificación adicional.** El único factor de autenticación es la contraseña (que además se guarda en texto plano). Sin MFA:

- Un atacante que robe una contraseña accede completamente a la cuenta
- No hay diferenciación de riesgo entre roles (admin sin MFA)
- No hay opción de recovery con segundo factor

### Estado actual

| Aspecto | Estado |
|---------|--------|
| MFA en login | ❌ No existe |
| TOTP (Google Auth / Authy) | ❌ No implementado |
| MFA obligatorio para admin | ❌ No forzado |
| Recovery codes | ❌ No existen |
| Setup de MFA en perfil | ❌ No hay |
| Recordar dispositivo confiable | ❌ No implementado |
| SMS/Email OTP como alternativa | ❌ No implementado |

### Qué hay que implementar

| Acción | Prioridad |
|--------|-----------|
| **MFA obligatorio para admins** al login | **Crítica** |
| **MFA opcional para sellers y users** desde configuración de perfil | **Alta** |
| **TOTP** con app authenticator (Google Authenticator, Authy, 1Password) | **Alta** |
| **Setup flow**: QR code + verificar código + recovery codes | **Alta** |
| **Recovery codes** (8-10 códigos de un solo uso) | **Alta** |
| **Recordar dispositivo** (cookie firmada por 30 días para no pedir MFA) | **Media** |
| **Forzar MFA setup** en el registro o primer login | **Media** |

### Arquitectura propuesta

#### Modelo de datos

```prisma
// Agregar a schema.prisma

model MFASecret {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  secret         String   // TOTP secret encriptado
  enabled        Boolean  @default(false)
  createdAt      DateTime @default(now())
  lastVerifiedAt DateTime?
}

model MFA recoveryCode {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  code      String   // Hasheado con bcrypt
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@unique([userId, code])
}
```

#### Setup de MFA

```typescript
// POST /api/auth/mfa/setup
// 1. Generar secreto TOTP con speakeasy
// 2. Devolver URL `otpauth://totp/...` + QR code
// 3. Frontend muestra QR, usuario escanea con app authenticator
// 4. Usuario ingresa código de verificación para confirmar

import * as speakeasy from 'speakeasy';

// Generar secreto
const secret = speakeasy.generateSecret({
  name: `ModularEcommerce:${user.email}`,
  issuer: 'Modular Ecommerce',
});

// Verificar código
const isValid = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userCode,
  window: 1, // Permitir 1 paso de desfase (30 seg)
});
```

#### Flujo de login con MFA

```
1. Usuario ingresa email + password
2. NextAuth authorize valida credenciales
3. Si el usuario tiene MFA habilitado:
   a. Redirigir a /auth/mfa/verify?token=<temporal>
   b. Usuario ingresa código TOTP
   c. Validar código → emitir JWT real
   d. Si recordar dispositivo: set cookie firmada
4. Si NO tiene MFA → emitir JWT directamente
```

Implementación con NextAuth:

```typescript
// En authorize(), en lugar de devolver el usuario directamente:
const user = await prisma.user.findUnique({ where: { email } });
// ... validar password ...

const mfaSecret = await prisma.mFASecret.findUnique({
  where: { userId: user.id }
});

if (mfaSecret?.enabled) {
  // No completar auth — devolver "requires-mfa"
  return {
    id: user.id,
    email: user.email,
    requiresMfa: true,
    mfaToken: generateMfaTempToken(user.id),
  };
}

// Si no tiene MFA, auth normal
return { id: user.id, email: user.email, role: user.role };
```

#### Recordar dispositivo confiable

```typescript
// Cookie firmada, por ejemplo: mfa_trust_{userId}
// Set para 30 días
// Incluir: userId, device fingerprint, expiresAt
// Verificar en el middleware de MFA

const trustToken = await sign(
  { userId: user.id, deviceId, exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 },
  process.env.NEXTAUTH_SECRET!
);
```

### Dependencias

```json
{
  "dependencies": {
    "speakeasy": "^2.x",
    "qrcode": "^1.x"
  },
  "devDependencies": {
    "@types/speakeasy": "^2.x",
    "@types/qrcode": "^1.x"
  }
}
```

### Archivos afectados

- `prisma/schema.prisma` — modelos `MFASecret`, `RecoveryCode`, campos extra
- `app/api/auth/mfa/setup/route.ts` — setup endpoint
- `app/api/auth/mfa/verify/route.ts` — verify endpoint
- `app/api/auth/[...nextauth]/route.ts` — modificar authorize
- `app/[locale]/auth/mfa/` — páginas de setup y verificación
- `modules/auth/application/` — use cases para MFA
- `modules/auth/domain/` — entidades de MFA

---

## 6. Verificación de email en login

### Dónde está el problema

Cualquier usuario puede hacer login con email+password aunque no haya verificado su email. Esto permite:
- Crear cuentas con emails falsos o temporales
- Usar recursos del sistema (ej: crear órdenes) sin una identidad verificada
- Spam / abuso del sistema

### Decisión: gate en login para email/password, no para Google OAuth

| Método | ¿Requiere verificación? | Razón |
|--------|------------------------|-------|
| Email + password | ✅ Sí | El email debe estar verificado antes de usar la cuenta |
| Google OAuth | ❌ No | Google ya verifica el email del usuario |

### Modelo

El campo `emailVerified` ya existe en el schema de Prisma:

```prisma
model User {
  // ...
  emailVerified DateTime?  // null = no verificado
  // ...
}
```

### Flujo

```
1. Register → user.emailVerified = null
2. Se genera token JWT con purpose: "email-verification" (expira 24h)
3. Se envía email con link de verificación vía EmailQueue (ver docs/emails.md)
4. Usuario hace clic → GET /api/auth/verify-email?token=<jwt>
5. Token válido → UPDATE user SET emailVerified = NOW()
6. Login exitoso
```

### Login gate

```typescript
// En authorize() de NextAuth (app/api/auth/[...nextauth]/route.ts)
if (!user.emailVerified && account?.provider !== 'google') {
  throw new Error('EMAIL_NOT_VERIFIED');
}
```

### Frontend

La página de login debe capturar `EMAIL_NOT_VERIFIED` y mostrar:
- Mensaje: "Tu email no está verificado. Revisa tu bandeja de entrada."
- Link: "Reenviar email de verificación" (con rate limit de 1 cada 5 min)

### Endpoints

| Método | Ruta | Propósito |
|--------|------|-----------|
| POST | `/api/auth/verify-email` | Verificar email con token JWT |
| POST | `/api/auth/resend-verification` | Reenviar verificación (rate limited) |

Ver detalle completo en [`docs/emails.md`](./emails.md).

---

## 7. Inyección SQL

### Dónde está el problema

Actualmente **bajo riesgo** porque usamos **Prisma**, que parametriza queries automáticamente. Sin embargo:

### Riesgos identificados

| Riesgo | Detalle | Prioridad |
|--------|---------|-----------|
| Prisma ORM | Las queries generadas son parametrizadas por defecto | 🟡 |
| Raw queries | Si en el futuro se usan `$queryRawUnsafe`, hay riesgo | Informar |
| Input validation | No hay sanitización de entrada en `formData`, `searchParams` | Media |
| Campos de texto | `customizationText` se pasa directo a la DB sin validación | Media |

### Qué hay que implementar

| Acción | Prioridad |
|--------|-----------|
| Validar y sanitizar input en todas las API routes | Alta |
| Nunca usar `$queryRawUnsafe` si se puede evitar | Preventivo |
| Usar `zod` para validación de schemas en endpoints | Media |
| Escapar output en server components (auto con Next.js) | Baja |

### Validación con Zod (ejemplo)

```typescript
import { z } from 'zod';

const CreateOrderSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive().max(100),
  customizationText: z.string().max(500).optional(),
  // ...
});
```

---

## 8. Logging y trazabilidad

### Dónde está el problema

```typescript
// En TODOS los archivos:
console.error('[SignupAPI] Error:', error);
console.error('[OutboxWorker] Loop error:', error);
console.error('[EventBus] Error in handler:', error);
```

**Solo hay `console.error` dispersos.** No existe:

- Logger estructurado (JSON, niveles, timestamp)
- Request ID / correlation ID para trazabilidad
- Auditoría de eventos de seguridad (login fallido, role change, etc.)
- Logs con contexto (usuario, IP, acción, recurso)
- Sistema de alertas

### Qué hay que implementar

| Acción | Prioridad |
|--------|-----------|
| Logger estructurado (pino, winston, o `pino` por ser el más rápido) | Alta |
| Request ID en cada petición (correlation ID) | Alta |
| Auditoría de eventos de seguridad (login, signup, role changes) | Alta |
| Middleware de logging para API routes | Alta |
| Outbox de eventos de auditoría (usar el event bus existente) | Media |
| Log rotation y retención | Media |

### Logger recomendado

```typescript
// shared/kernel/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});
```

### Eventos de seguridad a auditar

| Evento | Datos a registrar |
|--------|------------------|
| Login exitoso | userId, email, IP, timestamp |
| Login fallido | email, IP, timestamp, intento # |
| Signup | email, IP, timestamp |
| Cambio de role | adminId, targetUserId, oldRole, newRole |
| Creación de producto | sellerId, productId |
| Orden creada | userId, orderId, monto |
| Error de autorización | userId, ruta, role requerido |

---

## 9. Otras vulnerabilidades OWASP encontradas

### A05 — Security Misconfiguration

| Problema | Acción requerida | Prioridad |
|----------|-----------------|-----------|
| Sin CSP (Content Security Policy) | Agregar headers CSP en `next.config` o middleware | Alta |
| Sin HSTS | Agregar `Strict-Transport-Security` | Alta |
| Sin X-Frame-Options | Prevenir clickjacking | Media |
| Sin X-Content-Type-Options | Agregar `nosniff` | Media |
| Sin helmet-like headers | Usar `next-safe` o headers manuales | Media |
| Error messages expuestos | No devolver stack traces ni detalles internos | Alta |

Ejemplo de headers en middleware:

```typescript
const securityHeaders = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; " +
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; ",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

> Nota: Si se usa GA4, CSP debe permitir `googletagmanager.com` y `google-analytics.com`.
> Ver [`docs/seo-analytics.md`](./seo-analytics.md) para detalle.

### A06 — Vulnerable & Outdated Components

| Acción | Prioridad |
|--------|-----------|
| `npm audit` periódico | Media |
| `npm outdated` review | Media |
| Dependabot / Renovate en el repo | Media |
| Revisar `next-auth` v4 — migrar a v5 (Auth.js) si aplica | Baja |

### A07 — Identification & Auth Failures

Ver secciones dedicadas: **Rate Limiting** (#1), **Criptografía** (#2), **Gestión de sesiones** (#4), **MFA** (#5), **Verificación de email** (#6).

Resumen de lo que falta:

| Problema | Dónde se cubre | Prioridad |
|----------|----------------|-----------|
| Sin rate limiting → brute force | Sección 1 — Rate Limiting | Crítica |
| Passwords en texto plano | Sección 2 — Criptografía | Crítica |
| Sin verificación de email | Sección 6 — Email verification | Alta |
| Sin MFA/2FA | Sección 5 — MFA | Alta |
| Sin blacklist de tokens | Sección 4 — Sesiones | Alta |
| JWT sin rotación / expiración larga | Sección 4 — Sesiones | Alta |
| Sin bloqueo de IP | Sección 1 — Rate Limiting | Alta |

### A09 — Security Logging & Monitoring Failures

| Acción | Prioridad |
|--------|-----------|
| Dashboard de monitoreo (logs en Grafana, Datadog, o similar) | Baja |
| Alertas en tiempo real para eventos críticos | Media |
| Almacenamiento persistente de auditoría (tabla `audit_log`) | Alta |

---

## 10. Resumen de acciones inmediatas (Quick Wins)

| # | Acción | Archivos | Esfuerzo | Estado |
|---|--------|----------|----------|--------|
| 1 | **Hashear passwords con bcrypt** | signup + nextauth route | ⏱️ 30 min | ✅ Hecho |
| 2 | **Generar NEXTAUTH_SECRET real** | `.env` | ⏱️ 1 min | ✅ Hecho |
| 3 | **Email verification gate en login** | nextauth authorize + verify endpoint | ⏱️ 2-3 hs | ⬜ |
| 4 | **Cola de emails transaccionales** | EmailQueue + worker + Brevo | ⏱️ 3-4 hs | ⬜ |
| 5 | **Rate limiting en login** | login_attempt table + middleware | ⏱️ 2-3 hs | ⬜ |
| 6 | **Authorization guard** | middleware + shared/kernel | ⏱️ 3-5 hs | ⬜ |
| 7 | **Logout server-side + blacklist JWT** | sesiones + middleware | ⏱️ 4-6 hs | ⬜ |
| 8 | **Google Analytics + cookie consent** | GA4 script + cookie banner | ⏱️ 1-2 hs | ⬜ |
| 9 | **SEO metadata + sitemap + JSON-LD** | generateMetadata + sitemap.ts | ⏱️ 1-2 hs | ⬜ |
| 10 | **Logger estructurado** | shared/kernel/logger + wrapper | ⏱️ 1-2 hs | ⬜ |
| 11 | **Security headers (CSP, HSTS)** | middleware.ts | ⏱️ 1 hs | ⬜ |
| 12 | **Input validation con Zod** | API routes | ⏱️ 3-4 hs | ⬜ |
| 13 | **Módulo de roles funcional** | modules/roles/* | ⏱️ 6-8 hs | ⬜ |
| 14 | **MFA obligatorio para admins** | auth + MFA module | ⏱️ 6-8 hs | ⬜ |

---

## 11. Dependencias a instalar

```json
{
  "dependencies": {
    "bcrypt": "^5.x",
    "pino": "^9.x",
    "zod": "^3.x",
    "@getbrevo/brevo": "^1.x"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.x",
    "pino-pretty": "^11.x",
    "npm-audit": "latest"
  }
}
```

> **Nota**: No usamos Redis. Rate limiting, blacklist de tokens y cola de emails se implementan con Prisma. Ver [`docs/emails.md`](./emails.md) para detalle de la cola de emails.

Para **MFA** (futuro):

```json
{
  "dependencies": {
    "speakeasy": "^2.x",
    "qrcode": "^1.x"
  },
  "devDependencies": {
    "@types/speakeasy": "^2.x",
    "@types/qrcode": "^1.x"
  }
}
```

---

## Notas adicionales

### IDs inseguras
En `register-user-use-case.ts` se usa `Math.random().toString(36).substr(2, 9)` para generar IDs. Esto **no es criptográficamente seguro**. Reemplazar con `crypto.randomUUID()` o dejar que Prisma genere el CUID.

### Error handling
Las APIs devuelven `error.message` directamente. Esto puede exponer información interna. Crear un error handler centralizado que mapee errores conocidos a mensajes seguros.

### Locale en links
En `signin/page.tsx` el link "Sign Up" apunta a `/auth/signin` sin locale — debería ser `/${locale}/auth/signin`.

---

*Documento generado a partir de auditoría de código. Cada sección está priorizada por criticidad e impacto real en producción.*
