/**
 * Composition Root — central place where all dependencies are wired
 * according to the current environment.
 *
 * Call `initContainer()` once at each process entry point (worker, Next.js
 * server, test setup). After that, retrieve bindings via the typed getters.
 *
 * Architecture:
 *   Entry point  →  initContainer()        (runs once at startup)
 *   Any module   →  container.getXxx()     (retrieves the bound implementation)
 *
 * This keeps environment-specific choices in ONE file. Business logic
 * never knows whether it's talking to Brevo, bcrypt, or a console logger.
 *
 * This file is the ONLY place in the project that imports concrete adapters
 * (Prisma, Brevo, bcrypt, NextAuth). After the hexagonal cleanup lands,
 * imports point at `@/modules/email/*`, `@/modules/auth/*`, `@/modules/users/infrastructure/*`,
 * and `@/shared/infrastructure/*` only.
 *
 * Why static imports are safe here:
 *  - PrismaClient does NOT connect on construction
 *  - bcrypt is a side-effect-free import
 *  - brevo-email-sender.ts uses `import type` only, so statically importing
 *    the class does NOT load `brevo-client.ts` (which throws at load if
 *    BREVO_API_KEY is missing). The SDK is only loaded when send() is called.
 */

import type { EmailSender } from '@/modules/email/domain/email-sender';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';
import type { ForgotPasswordEmailPort } from '@/shared/contracts/email/forgot-password-email-port';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import type { RateLimiter } from '@/modules/auth/domain/rate-limiter';
import type { ResetTokenCodec } from '@/shared/contracts/security/reset-token-codec';
import type { SecretsPort } from '@/modules/auth/domain/secrets';
import type { SessionPort } from '@/modules/auth/domain/session';
import type { UserRepository } from '@/modules/users/domain/user-repository';
import type { RoleRepository } from '@/modules/roles/domain/role-repository';
import type { OrderRepository } from '@/modules/orders/domain/order-repository';
import type { ProductRepository } from '@/modules/products/domain/product-repository';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import type { UserLookupPort } from '@/modules/auth/domain/user-lookup';
import type { UsedResetTokenStorePort } from '@/shared/contracts/security/used-reset-token-store-port';
import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import type { UserVerificationPort } from '@/modules/auth/domain/ports/user-verification-port';
import type { RoleValidatorPort } from '@/modules/users/domain/ports/role-validator-port';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';
import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { CartRepository } from '@/modules/cart/domain/cart-repository';
import type { ProductRepository as CartProductRepository } from '@/modules/cart/domain/product-repository';
import type { PaidOrderCountPort } from '@/modules/cart/domain/paid-order-count-port';
import type { CustomizationLookupPort as OrderCustomizationLookupPort } from '@/modules/orders/domain/customization-lookup-port';
import type { CustomizationRepository } from '@/modules/customizations/domain/customization-repository';

import { BrevoEmailSender } from '@/modules/email/infrastructure/brevo-email-sender';
import { ConsoleEmailSender } from '@/modules/email/infrastructure/console-email-sender';
import { eventBus } from '@/modules/events/infrastructure/in-memory-event-bus';
import { PrismaOutboxRepository } from '@/shared/infrastructure/prisma-outbox-repository';
import { PrismaTransactionRunner } from '@/shared/infrastructure/prisma-transaction-runner';
import { PrismaRateLimiter } from '@/modules/auth/infrastructure/prisma-rate-limiter';
import { ProcessEnvSecrets } from '@/modules/auth/infrastructure/process-env-secrets';
import { NextAuthSessionAdapter } from '@/modules/auth/infrastructure/nextauth-session';
import { JwtResetTokenCodec } from '@/modules/auth/infrastructure/jwt-reset-token-codec';
import { PrismaUserRepository } from '@/modules/users/infrastructure/prisma-user-repository';
import { PrismaSellerRepository } from '@/modules/sellers/infrastructure/prisma-seller-repository';
import { PrismaRoleRepository } from '@/modules/roles/infrastructure/prisma-role-repository';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';
import { PrismaEmailQueueRepository } from '@/modules/email/infrastructure/prisma-email-queue-repository';
import { PrismaUserLookup } from '@/modules/auth/infrastructure/prisma-user-lookup';
import { ConsoleForgotPasswordEmail } from '@/modules/auth/infrastructure/console-forgot-password-email';
import { MemoryUsedResetTokenStore } from '@/modules/auth/infrastructure/memory-used-reset-token-store';
import { SeedRolesUseCase } from '@/modules/roles/application/use-cases/seed-roles-use-case';
import {
  hashPassword,
  verifyPassword,
} from '@/modules/users/infrastructure/bcrypt-password-hasher';
import { UserVerificationAdapter } from '@/modules/users/infrastructure/user-verification-adapter';
import { RoleValidatorAdapter } from '@/modules/roles/infrastructure/role-validator-adapter';
import { R2StorageAdapter } from '@/modules/uploads/infrastructure/r2-storage-adapter';
import { PrismaUploadRepository } from '@/modules/uploads/infrastructure/prisma-upload-repository';
import { PrismaCartRepository } from '@/modules/cart/infrastructure/prisma-cart-repository';
import { CartProductRepositoryAdapter } from '@/modules/cart/infrastructure/cart-product-repository-adapter';
import { CustomizationLookupAdapter } from '@/modules/cart/infrastructure/customization-lookup-adapter';
import { PrismaPaidOrderCountAdapter } from '@/modules/orders/infrastructure/prisma-paid-order-count-adapter';
import { HandleCartCheckedOut } from '@/modules/orders/application/handle-cart-checked-out';
import { PrismaCustomizationRepository } from '@/modules/customizations/infrastructure/prisma-customization-repository';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _emailSender: EmailSender | null = null;
let _outboxRepository: OutboxRepository | null = null;
let _passwordHasher: PasswordHasher | null = null;
let _rateLimiter: RateLimiter | null = null;
let _resetTokenCodec: ResetTokenCodec | null = null;
let _eventBus: EventBusPort | null = null;
let _secrets: SecretsPort | null = null;
let _session: SessionPort | null = null;
let _userRepository: UserRepository | null = null;
let _roleRepository: RoleRepository | null = null;
let _orderRepository: OrderRepository | null = null;
let _productRepository: ProductRepository | null = null;
let _emailQueueRepository: EmailQueueRepository | null = null;
let _userLookup: UserLookupPort | null = null;
let _forgotPasswordEmailPort: ForgotPasswordEmailPort | null = null;
let _usedResetTokenStore: UsedResetTokenStorePort | null = null;
let _sellerRepository: SellerRepository | null = null;
let _transactionRunner: TransactionRunner | null = null;
let _userVerification: UserVerificationPort | null = null;
let _roleValidator: RoleValidatorPort | null = null;
let _storagePort: StoragePort | null = null;
let _uploadRepository: UploadRepository | null = null;
let _cartRepository: CartRepository | null = null;
let _cartProductRepository: CartProductRepository | null = null;
let _paidOrderCountPort: PaidOrderCountPort | null = null;
let _customizationLookup: OrderCustomizationLookupPort | null = null;
let _customizationRepository: CustomizationRepository | null = null;

// Idempotency flag for event subscriptions — prevents double registration
// during HMR in development.
let _cartEventsSubscribed = false;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize all dependency bindings for the current environment.
 * Idempotent — calling it again is a no-op because every binding is
 * short-circuited by a null check.
 */
export function initContainer(): void {
  // --- EmailSender: env-dependent (Brevo in production, console otherwise) ---
  if (!_emailSender) {
    if (process.env.NODE_ENV === 'production') {
      _emailSender = new BrevoEmailSender();
    } else {
      _emailSender = new ConsoleEmailSender();
    }
  }

  // --- OutboxRepository: single Prisma adapter works in every env ---
  if (!_outboxRepository) {
    _outboxRepository = new PrismaOutboxRepository();
  }

  // --- PasswordHasher: bcrypt adapter wrapped to match the port ---
  if (!_passwordHasher) {
    _passwordHasher = {
      hash: hashPassword,
      verify: verifyPassword,
    };
  }

  // --- RateLimiter: Prisma-backed adapter (works in every env) ---
  if (!_rateLimiter) {
    _rateLimiter = new PrismaRateLimiter();
  }

  // --- EventBus: process-wide in-memory bus (single-process default) ---
  if (!_eventBus) {
    _eventBus = eventBus;
  }

  // --- SecretsPort: process.env with fail-fast validation ---
  if (!_secrets) {
    _secrets = new ProcessEnvSecrets();
  }

  // --- SessionPort: NextAuth adapter ---
  if (!_session) {
    _session = new NextAuthSessionAdapter();
  }

  // --- UserRepository: Prisma adapter ---
  if (!_userRepository) {
    _userRepository = new PrismaUserRepository();
  }

  // --- RoleRepository: Prisma adapter + seed ---
  if (!_roleRepository) {
    _roleRepository = new PrismaRoleRepository();
    // Seed default roles on first boot (idempotent, no-op if roles exist).
    const seedRoles = new SeedRolesUseCase(_roleRepository);
    seedRoles.execute().catch((err) => {
      console.error('[container] Role seed failed:', err);
    });
  }

  // --- OrderRepository: Prisma adapter ---
  if (!_orderRepository) {
    _orderRepository = new PrismaOrderRepository();
  }

  // --- ProductRepository: Prisma adapter ---
  if (!_productRepository) {
    _productRepository = new PrismaProductRepository();
  }

  // --- EmailQueueRepository: Prisma adapter ---
  if (!_emailQueueRepository) {
    _emailQueueRepository = new PrismaEmailQueueRepository();
  }

  // --- UserLookupPort: Prisma adapter ---
  if (!_userLookup) {
    _userLookup = new PrismaUserLookup();
  }

  // --- ForgotPasswordEmailPort: console mock in dev (real email sender in prod via EmailSender) ---
  if (!_forgotPasswordEmailPort) {
    _forgotPasswordEmailPort = new ConsoleForgotPasswordEmail();
  }

  // --- UsedResetTokenStore: in-memory adapter (single process) ---
  if (!_usedResetTokenStore) {
    _usedResetTokenStore = new MemoryUsedResetTokenStore();
  }

  // --- SellerRepository: Prisma adapter ---
  if (!_sellerRepository) {
    _sellerRepository = new PrismaSellerRepository();
  }

  // --- TransactionRunner: Prisma-backed atomic unit-of-work ---
  if (!_transactionRunner) {
    _transactionRunner = new PrismaTransactionRunner();
  }

  // --- UserVerificationPort: adapter bridging auth's port to users infrastructure ---
  if (!_userVerification) {
    _userVerification = new UserVerificationAdapter(_userRepository!);
  }

  // --- RoleValidatorPort: adapter bridging users' port to roles infrastructure ---
  if (!_roleValidator) {
    _roleValidator = new RoleValidatorAdapter(_roleRepository!);
  }

  // --- StoragePort: R2 adapter for uploads ---
  if (!_storagePort) {
    _storagePort = new R2StorageAdapter();
  }

  // --- UploadRepository: Prisma adapter ---
  if (!_uploadRepository) {
    _uploadRepository = new PrismaUploadRepository();
  }

  // --- CartRepository: Prisma adapter ---
  if (!_cartRepository) {
    _cartRepository = new PrismaCartRepository();
  }

  // --- CartProductRepository: adapter bridging cart's port to the products module ---
  if (!_cartProductRepository) {
    _cartProductRepository = new CartProductRepositoryAdapter(
      _productRepository!,
    );
  }

  // --- PaidOrderCountPort: adapter bridging cart's port to the orders module ---
  if (!_paidOrderCountPort) {
    _paidOrderCountPort = new PrismaPaidOrderCountAdapter(_orderRepository!);
  }

  // --- CustomizationRepository: Prisma adapter ---
  if (!_customizationRepository) {
    _customizationRepository = new PrismaCustomizationRepository();
  }

  // --- CustomizationLookupPort: shared adapter for cart and orders ports ---
  if (!_customizationLookup) {
    _customizationLookup = new CustomizationLookupAdapter(
      _customizationRepository!,
    );
  }

  // --- Cart event subscriptions (idempotent for HMR) ---
  if (!_cartEventsSubscribed) {
    const handler = new HandleCartCheckedOut(
      _orderRepository!,
      _outboxRepository!,
      _transactionRunner!,
      _customizationLookup!,
    );
    HandleCartCheckedOut.subscribe(_eventBus!, handler);
    _cartEventsSubscribed = true;
  }
}

// ---------------------------------------------------------------------------
// Getters (auto-initialize on first access)
// ---------------------------------------------------------------------------

/**
 * Returns the EmailSender bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getEmailSender(): EmailSender {
  if (!_emailSender) initContainer();
  return _emailSender!;
}

/**
 * Returns the OutboxRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getOutboxRepository(): OutboxRepository {
  if (!_outboxRepository) initContainer();
  return _outboxRepository!;
}

/**
 * Returns the PasswordHasher bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getPasswordHasher(): PasswordHasher {
  if (!_passwordHasher) initContainer();
  return _passwordHasher!;
}

/**
 * Returns the RateLimiter bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getRateLimiter(): RateLimiter {
  if (!_rateLimiter) initContainer();
  return _rateLimiter!;
}

/**
 * Returns the ResetTokenCodec bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 * Lazy-creates a JwtResetTokenCodec using the secret from SecretsPort.
 * In tests, call `container.setResetTokenCodec()` BEFORE any getter to
 * inject a Base64ResetTokenCodec that doesn't need NEXTAUTH_SECRET.
 */
export function getResetTokenCodec(): ResetTokenCodec {
  if (!_resetTokenCodec) {
    initContainer();
    _resetTokenCodec = new JwtResetTokenCodec(_secrets!.getAuthSecret());
  }
  return _resetTokenCodec;
}

/**
 * Returns the EventBus bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 * Default binding is the in-memory `eventBus` singleton.
 */
export function getEventBus(): EventBusPort {
  if (!_eventBus) initContainer();
  return _eventBus!;
}

/**
 * Returns the SecretsPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getSecrets(): SecretsPort {
  if (!_secrets) initContainer();
  return _secrets!;
}

/**
 * Returns the SessionPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getSession(): SessionPort {
  if (!_session) initContainer();
  return _session!;
}

/**
 * Returns the UserRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getUserRepository(): UserRepository {
  if (!_userRepository) initContainer();
  return _userRepository!;
}

/**
 * Returns the RoleRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getRoleRepository(): RoleRepository {
  if (!_roleRepository) initContainer();
  return _roleRepository!;
}

/**
 * Returns the OrderRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getOrderRepository(): OrderRepository {
  if (!_orderRepository) initContainer();
  return _orderRepository!;
}

/**
 * Returns the ProductRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getProductRepository(): ProductRepository {
  if (!_productRepository) initContainer();
  return _productRepository!;
}

/**
 * Returns the EmailQueueRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getEmailQueueRepository(): EmailQueueRepository {
  if (!_emailQueueRepository) initContainer();
  return _emailQueueRepository!;
}

/**
 * Returns the UserLookupPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getUserLookup(): UserLookupPort {
  if (!_userLookup) initContainer();
  return _userLookup!;
}

/**
 * Returns the ForgotPasswordEmailPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getForgotPasswordEmailPort(): ForgotPasswordEmailPort {
  if (!_forgotPasswordEmailPort) initContainer();
  return _forgotPasswordEmailPort!;
}

/**
 * Returns the UsedResetTokenStore bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getUsedResetTokenStore(): UsedResetTokenStorePort {
  if (!_usedResetTokenStore) initContainer();
  return _usedResetTokenStore!;
}

/**
 * Returns the SellerRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getSellerRepository(): SellerRepository {
  if (!_sellerRepository) initContainer();
  return _sellerRepository!;
}

/**
 * Returns the TransactionRunner bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 * Use this in use cases that need to persist multiple writes atomically
 * (e.g. user + seller in one go).
 */
export function getTransactionRunner(): TransactionRunner {
  if (!_transactionRunner) initContainer();
  return _transactionRunner!;
}

/**
 * Returns the UserVerificationPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getUserVerification(): UserVerificationPort {
  if (!_userVerification) initContainer();
  return _userVerification!;
}

/**
 * Returns the RoleValidatorPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getRoleValidator(): RoleValidatorPort {
  if (!_roleValidator) initContainer();
  return _roleValidator!;
}

/**
 * Returns the StoragePort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getStoragePort(): StoragePort {
  if (!_storagePort) initContainer();
  return _storagePort!;
}

/**
 * Returns the UploadRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getUploadRepository(): UploadRepository {
  if (!_uploadRepository) initContainer();
  return _uploadRepository!;
}

/**
 * Returns the CartRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getCartRepository(): CartRepository {
  if (!_cartRepository) initContainer();
  return _cartRepository!;
}

/**
 * Returns the CartProductRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getCartProductRepository(): CartProductRepository {
  if (!_cartProductRepository) initContainer();
  return _cartProductRepository!;
}

/**
 * Returns the PaidOrderCountPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getPaidOrderCountPort(): PaidOrderCountPort {
  if (!_paidOrderCountPort) initContainer();
  return _paidOrderCountPort!;
}

/**
 * Returns the CustomizationLookupPort bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getCustomizationLookup(): OrderCustomizationLookupPort {
  if (!_customizationLookup) initContainer();
  return _customizationLookup!;
}

/**
 * Returns the CustomizationRepository bound for the current environment.
 * Auto-initializes the container on first call if not already initialized.
 */
export function getCustomizationRepository(): CustomizationRepository {
  if (!_customizationRepository) initContainer();
  return _customizationRepository!;
}

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------
// In tests you can call `initContainer()` or override individual bindings:
//
//   import { container } from '@/composition-root/container';
//   container.setUserRepository(new MemoryUserRepository());
//
// This keeps test setup explicit without touching NODE_ENV.

export const container = {
  init: initContainer,
  getEmailSender,
  getOutboxRepository,
  getPasswordHasher,
  getRateLimiter,
  getResetTokenCodec,
  getEventBus,
  getSecrets,
  getSession,
  getUserRepository,
  getRoleRepository,
  getOrderRepository,
  getProductRepository,
  getEmailQueueRepository,
  getUserLookup,
  getForgotPasswordEmailPort,
  getUsedResetTokenStore,
  getSellerRepository,
  getTransactionRunner,
  getUserVerification,
  getRoleValidator,
  getStoragePort,
  getUploadRepository,
  getCartRepository,
  getCartProductRepository,
  getPaidOrderCountPort,
  getCustomizationLookup,
  getCustomizationRepository,
  /** Override — useful in tests to inject a mock without touching env vars. */
  setEmailSender(sender: EmailSender): void {
    _emailSender = sender;
  },
  /** Override — useful in tests to inject an in-memory outbox. */
  setOutboxRepository(repo: OutboxRepository): void {
    _outboxRepository = repo;
  },
  /** Override — useful in tests to inject a fake/stub hasher. */
  setPasswordHasher(hasher: PasswordHasher): void {
    _passwordHasher = hasher;
  },
  /** Override — useful in tests to inject an in-memory rate limiter. */
  setRateLimiter(limiter: RateLimiter): void {
    _rateLimiter = limiter;
  },
  /** Override — useful in tests to inject a Base64ResetTokenCodec. */
  setResetTokenCodec(codec: ResetTokenCodec): void {
    _resetTokenCodec = codec;
  },
  /** Override — useful in tests to inject a fresh event bus (avoids handler leakage). */
  setEventBus(bus: EventBusPort): void {
    _eventBus = bus;
  },
  /** Override — useful in tests to inject mock secrets. */
  setSecrets(secrets: SecretsPort): void {
    _secrets = secrets;
  },
  /** Override — useful in tests to simulate authenticated/unauthenticated sessions. */
  setSession(session: SessionPort): void {
    _session = session;
  },
  /** Override — useful in tests to inject an in-memory user repository. */
  setUserRepository(repo: UserRepository): void {
    _userRepository = repo;
  },
  /** Override — useful in tests to inject an in-memory role repository. */
  setRoleRepository(repo: RoleRepository): void {
    _roleRepository = repo;
  },
  /** Override — useful in tests to inject an in-memory order repository. */
  setOrderRepository(repo: OrderRepository): void {
    _orderRepository = repo;
  },
  /** Override — useful in tests to inject an in-memory product repository. */
  setProductRepository(repo: ProductRepository): void {
    _productRepository = repo;
  },
  /** Override — useful in tests to inject an in-memory email queue. */
  setEmailQueueRepository(repo: EmailQueueRepository): void {
    _emailQueueRepository = repo;
  },
  /** Override — useful in tests to inject an in-memory user lookup. */
  setUserLookup(port: UserLookupPort): void {
    _userLookup = port;
  },
  /** Override — useful in tests to inject a mock ForgotPasswordEmailPort. */
  setForgotPasswordEmailPort(port: ForgotPasswordEmailPort): void {
    _forgotPasswordEmailPort = port;
  },
  /** Override — useful in tests to inject a fresh UsedResetTokenStore. */
  setUsedResetTokenStore(store: UsedResetTokenStorePort): void {
    _usedResetTokenStore = store;
  },
  /** Override — useful in tests to inject an in-memory seller repository. */
  setSellerRepository(repo: SellerRepository): void {
    _sellerRepository = repo;
  },
  /** Override — useful in tests to inject a fake/stub transaction runner. */
  setTransactionRunner(runner: TransactionRunner): void {
    _transactionRunner = runner;
  },
  /** Override — useful in tests to inject a mock UserVerificationPort. */
  setUserVerification(port: UserVerificationPort): void {
    _userVerification = port;
  },
  /** Override — useful in tests to inject a mock RoleValidatorPort. */
  setRoleValidator(port: RoleValidatorPort): void {
    _roleValidator = port;
  },
  /** Override — useful in tests to inject a mock StoragePort. */
  setStoragePort(port: StoragePort): void {
    _storagePort = port;
  },
  /** Override — useful in tests to inject an in-memory upload repository. */
  setUploadRepository(repo: UploadRepository): void {
    _uploadRepository = repo;
  },
  /** Override — useful in tests to inject an in-memory cart repository. */
  setCartRepository(repo: CartRepository): void {
    _cartRepository = repo;
  },
  /** Override — useful in tests to inject a mock cart product repository. */
  setCartProductRepository(repo: CartProductRepository): void {
    _cartProductRepository = repo;
  },
  /** Override — useful in tests to inject a mock paid order count port. */
  setPaidOrderCountPort(port: PaidOrderCountPort): void {
    _paidOrderCountPort = port;
  },
  /** Override — useful in tests to inject a mock customization lookup port. */
  setCustomizationLookup(port: OrderCustomizationLookupPort): void {
    _customizationLookup = port;
  },
  /** Override — useful in tests to inject a mock customization repository. */
  setCustomizationRepository(repo: CustomizationRepository): void {
    _customizationRepository = repo;
  },
  /** Reset the event subscription flag — useful in tests to allow re-subscription. */
  resetCartEventSubscriptions(): void {
    _cartEventsSubscribed = false;
  },
};
