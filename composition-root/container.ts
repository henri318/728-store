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
import type { CheckoutGroupLookupPort } from '@/modules/payments/domain/checkout-group-lookup-port';
import type { CheckoutGroupPaymentPort } from '@/modules/payments/domain/checkout-group-payment-port';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import type { UserLookupPort } from '@/modules/auth/domain/user-lookup';
import type { UsedResetTokenStorePort } from '@/shared/contracts/security/used-reset-token-store-port';
import type { SellerLookupPort } from '@/modules/orders/domain/seller-lookup-port';
import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import type { UserVerificationPort } from '@/modules/auth/domain/ports/user-verification-port';
import type { RoleValidatorPort } from '@/modules/users/domain/ports/role-validator-port';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';
import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { CartRepository } from '@/modules/cart/domain/cart-repository';
import type { ProductRepository as CartProductRepository } from '@/modules/cart/domain/product-repository';
import type { PaidOrderCountPort } from '@/modules/cart/domain/paid-order-count-port';
import type { CustomizationLookupPort as CartCustomizationLookupPort } from '@/modules/cart/domain/customization-lookup-port';
import type { CustomizationRepository } from '@/modules/customizations/domain/customization-repository';
import type { SearchHistoryRepository } from '@/modules/search-history/domain/search-history-repository';

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
import { PrismaCheckoutGroupLookup } from '@/modules/payments/infrastructure/prisma-checkout-group-lookup';
import { PrismaCheckoutGroupPaymentPort } from '@/modules/payments/infrastructure/prisma-checkout-group-payment-port';
import { SeedRolesUseCase } from '@/modules/roles/application/use-cases/seed-roles-use-case';
import {
  hashPassword,
  verifyPassword,
} from '@/modules/users/infrastructure/bcrypt-password-hasher';
import { UserVerificationAdapter } from '@/modules/users/infrastructure/user-verification-adapter';
import { RoleValidatorAdapter } from '@/modules/roles/infrastructure/role-validator-adapter';
import { R2StorageAdapter } from '@/modules/uploads/infrastructure/r2-storage-adapter';
import { LocalStorageAdapter } from '@/modules/uploads/infrastructure/local-storage-adapter';
import { PrismaUploadRepository } from '@/modules/uploads/infrastructure/prisma-upload-repository';
import { PrismaCartRepository } from '@/modules/cart/infrastructure/prisma-cart-repository';
import { CartProductRepositoryAdapter } from '@/modules/cart/infrastructure/cart-product-repository-adapter';
import { CustomizationLookupAdapter } from '@/modules/cart/infrastructure/customization-lookup-adapter';
import { PrismaPaidOrderCountAdapter } from '@/modules/orders/infrastructure/prisma-paid-order-count-adapter';
import { SellerLookupAdapter } from '@/modules/orders/infrastructure/seller-lookup-adapter';
import { HandleCartCheckedOut } from '@/modules/orders/application/handle-cart-checked-out';
import { PrismaCustomizationRepository } from '@/modules/customizations/infrastructure/prisma-customization-repository';
import { PrismaSearchHistoryRepository } from '@/modules/search-history/infrastructure/prisma-search-history-repository';
import { HandleProductSearchExecuted } from '@/modules/search-history/application/handle-product-search-executed';
import { RecordSearchUseCase } from '@/modules/search-history/application/record-search-use-case';

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
let _checkoutGroupLookup: CheckoutGroupLookupPort | null = null;
let _checkoutGroupPaymentPort: CheckoutGroupPaymentPort | null = null;
let _sellerRepository: SellerRepository | null = null;
let _sellerLookup: SellerLookupPort | null = null;
let _transactionRunner: TransactionRunner | null = null;
let _userVerification: UserVerificationPort | null = null;
let _roleValidator: RoleValidatorPort | null = null;
let _storagePort: StoragePort | null = null;
let _uploadRepository: UploadRepository | null = null;
let _cartRepository: CartRepository | null = null;
let _cartProductRepository: CartProductRepository | null = null;
let _paidOrderCountPort: PaidOrderCountPort | null = null;
let _customizationLookup: CartCustomizationLookupPort | null = null;
let _customizationRepository: CustomizationRepository | null = null;
let _searchHistoryRepository: SearchHistoryRepository | null = null;

function isLocalUploadStorage(): boolean {
  return process.env.SEED_PRODUCT_ASSET_LOCAL_STORAGE === 'true';
}

// Idempotency flag for event subscriptions — prevents double registration
// during HMR in development.
let _isCartEventsSubscribed = false;
let _isSearchHistoryEventsSubscribed = false;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize all dependency bindings for the current environment.
 * Idempotent — calling it again is a no-op because every binding is
 * short-circuited by a null check.
 */

/**
 * Initialize all dependency bindings for the current environment.
 * Idempotent — calling it again is a no-op because each getter is guarded
 * by a null check.
 *
 * Each getter lazily initializes its own dependency so this function simply
 * calls every getter to trigger first-time initialization.
 */
export function initContainer(): void {
  // Calling each getter triggers lazy initialization of its dependency.
  getEmailSender();
  getOutboxRepository();
  getPasswordHasher();
  getRateLimiter();
  getEventBus();
  getSecrets();
  getSession();
  getUserRepository();
  getRoleRepository();
  getOrderRepository();
  getCheckoutGroupLookup();
  getCheckoutGroupPaymentPort();
  getProductRepository();
  getEmailQueueRepository();
  getUserLookup();
  getForgotPasswordEmailPort();
  getUsedResetTokenStore();
  getSellerRepository();
  getSellerLookup();
  getTransactionRunner();
  getUserVerification();
  getRoleValidator();
  getStoragePort();
  getUploadRepository();
  getCartRepository();
  getCartProductRepository();
  getPaidOrderCountPort();
  getCustomizationRepository();
  getCustomizationLookup();
  getSearchHistoryRepository();
  getResetTokenCodec();

  // --- Cart event subscriptions (idempotent for HMR) ---
  if (!_isCartEventsSubscribed) {
    const handler = new HandleCartCheckedOut(
      _orderRepository!,
      _outboxRepository!,
      _transactionRunner!,
      _customizationLookup!,
    );
    HandleCartCheckedOut.subscribe(_eventBus!, handler);
    _isCartEventsSubscribed = true;
  }

  // --- Search-history event subscriptions (idempotent for HMR) ---
  if (!_isSearchHistoryEventsSubscribed) {
    const subscriber = new HandleProductSearchExecuted(
      new RecordSearchUseCase(_searchHistoryRepository!),
    );
    HandleProductSearchExecuted.subscribe(_eventBus!, subscriber);
    _isSearchHistoryEventsSubscribed = true;
  }
}

// ---------------------------------------------------------------------------
// Getters (auto-initialize on first access)
// ---------------------------------------------------------------------------

/**
 * Returns the EmailSender bound for the current environment.
 * Lazily initializes on first access.
 */
export function getEmailSender(): EmailSender {
  if (!_emailSender) {
    _emailSender =
      process.env.NODE_ENV === 'production'
        ? new BrevoEmailSender()
        : new ConsoleEmailSender();
  }
  return _emailSender;
}

/**
 * Returns the OutboxRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getOutboxRepository(): OutboxRepository {
  if (!_outboxRepository) {
    _outboxRepository = new PrismaOutboxRepository();
  }
  return _outboxRepository;
}

/**
 * Returns the PasswordHasher bound for the current environment.
 * Lazily initializes on first access.
 */
export function getPasswordHasher(): PasswordHasher {
  if (!_passwordHasher) {
    _passwordHasher = {
      hash: hashPassword,
      verify: verifyPassword,
    };
  }
  return _passwordHasher;
}

/**
 * Returns the RateLimiter bound for the current environment.
 * Lazily initializes on first access.
 */
export function getRateLimiter(): RateLimiter {
  if (!_rateLimiter) {
    _rateLimiter = new PrismaRateLimiter();
  }
  return _rateLimiter;
}

/**
 * Returns the ResetTokenCodec bound for the current environment.
 * Lazily initializes on first access.
 * Needs SecretsPort, which is also lazy-initialized on first access.
 */
export function getResetTokenCodec(): ResetTokenCodec {
  if (!_resetTokenCodec) {
    _resetTokenCodec = new JwtResetTokenCodec(getSecrets().getAuthSecret());
  }
  return _resetTokenCodec;
}

/**
 * Returns the EventBus bound for the current environment.
 * Default binding is the in-memory eventBus singleton.
 */
export function getEventBus(): EventBusPort {
  if (!_eventBus) {
    _eventBus = eventBus;
  }
  return _eventBus;
}

/**
 * Returns the SecretsPort bound for the current environment.
 * Lazily initializes on first access.
 */
export function getSecrets(): SecretsPort {
  if (!_secrets) {
    _secrets = new ProcessEnvSecrets();
  }
  return _secrets;
}

/**
 * Returns the SessionPort bound for the current environment.
 * Lazily initializes on first access.
 */
export function getSession(): SessionPort {
  if (!_session) {
    _session = new NextAuthSessionAdapter();
  }
  return _session;
}

/**
 * Returns the UserRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getUserRepository(): UserRepository {
  if (!_userRepository) {
    _userRepository = new PrismaUserRepository();
  }
  return _userRepository;
}

/**
 * Returns the RoleRepository bound for the current environment.
 * Lazily initializes on first access and seeds default roles.
 */
export function getRoleRepository(): RoleRepository {
  if (!_roleRepository) {
    _roleRepository = new PrismaRoleRepository();
    // Seed default roles on first boot (idempotent, no-op if roles exist).
    const seedRoles = new SeedRolesUseCase(_roleRepository);
    (async () => {
      try {
        await seedRoles.execute();
      } catch (error) {
        console.error('[container] Role seed failed:', error);
      }
    })();
  }
  return _roleRepository;
}

/**
 * Returns the OrderRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getOrderRepository(): OrderRepository {
  if (!_orderRepository) {
    _orderRepository = new PrismaOrderRepository();
  }
  return _orderRepository;
}

/**
 * Returns the CheckoutGroupLookupPort bound for the current environment.
 * Lazily initializes on first access.
 */
export function getCheckoutGroupLookup(): CheckoutGroupLookupPort {
  if (!_checkoutGroupLookup) {
    _checkoutGroupLookup = new PrismaCheckoutGroupLookup();
  }
  return _checkoutGroupLookup;
}

/**
 * Returns the CheckoutGroupPaymentPort bound for the current environment.
 * Lazily initializes on first access.
 */
export function getCheckoutGroupPaymentPort(): CheckoutGroupPaymentPort {
  if (!_checkoutGroupPaymentPort) {
    _checkoutGroupPaymentPort = new PrismaCheckoutGroupPaymentPort();
  }
  return _checkoutGroupPaymentPort;
}

/**
 * Returns the ProductRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getProductRepository(): ProductRepository {
  if (!_productRepository) {
    _productRepository = new PrismaProductRepository();
  }
  return _productRepository;
}

/**
 * Returns the EmailQueueRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getEmailQueueRepository(): EmailQueueRepository {
  if (!_emailQueueRepository) {
    _emailQueueRepository = new PrismaEmailQueueRepository();
  }
  return _emailQueueRepository;
}

/**
 * Returns the UserLookupPort bound for the current environment.
 * Lazily initializes on first access.
 */
export function getUserLookup(): UserLookupPort {
  if (!_userLookup) {
    _userLookup = new PrismaUserLookup();
  }
  return _userLookup;
}

/**
 * Returns the ForgotPasswordEmailPort bound for the current environment.
 * Lazily initializes on first access.
 */
export function getForgotPasswordEmailPort(): ForgotPasswordEmailPort {
  if (!_forgotPasswordEmailPort) {
    _forgotPasswordEmailPort = new ConsoleForgotPasswordEmail();
  }
  return _forgotPasswordEmailPort;
}

/**
 * Returns the UsedResetTokenStore bound for the current environment.
 * Lazily initializes on first access.
 */
export function getUsedResetTokenStore(): UsedResetTokenStorePort {
  if (!_usedResetTokenStore) {
    _usedResetTokenStore = new MemoryUsedResetTokenStore();
  }
  return _usedResetTokenStore;
}

/**
 * Returns the SellerRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getSellerRepository(): SellerRepository {
  if (!_sellerRepository) {
    _sellerRepository = new PrismaSellerRepository();
  }
  return _sellerRepository;
}

/**
 * Returns the SellerLookupPort bound for the current environment.
 * Lazily initializes on first access, resolving SellerRepository via its own getter.
 */
export function getSellerLookup(): SellerLookupPort {
  if (!_sellerLookup) {
    _sellerLookup = new SellerLookupAdapter(getSellerRepository());
  }
  return _sellerLookup;
}

/**
 * Returns the TransactionRunner bound for the current environment.
 * Lazily initializes on first access.
 */
export function getTransactionRunner(): TransactionRunner {
  if (!_transactionRunner) {
    _transactionRunner = new PrismaTransactionRunner();
  }
  return _transactionRunner;
}

/**
 * Returns the UserVerificationPort bound for the current environment.
 * Lazily initializes on first access, resolving UserRepository via its own getter.
 */
export function getUserVerification(): UserVerificationPort {
  if (!_userVerification) {
    _userVerification = new UserVerificationAdapter(getUserRepository());
  }
  return _userVerification;
}

/**
 * Returns the RoleValidatorPort bound for the current environment.
 * Lazily initializes on first access, resolving RoleRepository via its own getter.
 */
export function getRoleValidator(): RoleValidatorPort {
  if (!_roleValidator) {
    _roleValidator = new RoleValidatorAdapter(getRoleRepository());
  }
  return _roleValidator;
}

/**
 * Returns the StoragePort bound for the current environment.
 * Lazily initializes on first access — R2 in production, local storage for seed/data tasks.
 */
export function getStoragePort(): StoragePort {
  if (!_storagePort) {
    _storagePort = isLocalUploadStorage()
      ? new LocalStorageAdapter()
      : new R2StorageAdapter();
  }
  return _storagePort;
}

/**
 * Returns the UploadRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getUploadRepository(): UploadRepository {
  if (!_uploadRepository) {
    _uploadRepository = new PrismaUploadRepository();
  }
  return _uploadRepository;
}

/**
 * Returns the CartRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getCartRepository(): CartRepository {
  if (!_cartRepository) {
    _cartRepository = new PrismaCartRepository();
  }
  return _cartRepository;
}

/**
 * Returns the CartProductRepository bound for the current environment.
 * Lazily initializes on first access, resolving ProductRepository via its own getter.
 */
export function getCartProductRepository(): CartProductRepository {
  if (!_cartProductRepository) {
    _cartProductRepository = new CartProductRepositoryAdapter(
      getProductRepository(),
    );
  }
  return _cartProductRepository;
}

/**
 * Returns the PaidOrderCountPort bound for the current environment.
 * Lazily initializes on first access, resolving OrderRepository via its own getter.
 */
export function getPaidOrderCountPort(): PaidOrderCountPort {
  if (!_paidOrderCountPort) {
    _paidOrderCountPort = new PrismaPaidOrderCountAdapter(getOrderRepository());
  }
  return _paidOrderCountPort;
}

/**
 * Returns the CustomizationRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getCustomizationRepository(): CustomizationRepository {
  if (!_customizationRepository) {
    _customizationRepository = new PrismaCustomizationRepository();
  }
  return _customizationRepository;
}

/**
 * Returns the CustomizationLookupPort bound for the current environment.
 * Lazily initializes on first access, resolving CustomizationRepository via its own getter.
 */
export function getCustomizationLookup(): CartCustomizationLookupPort {
  if (!_customizationLookup) {
    _customizationLookup = new CustomizationLookupAdapter(
      getCustomizationRepository(),
    );
  }
  return _customizationLookup;
}

/**
 * Returns the SearchHistoryRepository bound for the current environment.
 * Lazily initializes on first access.
 */
export function getSearchHistoryRepository(): SearchHistoryRepository {
  if (!_searchHistoryRepository) {
    _searchHistoryRepository = new PrismaSearchHistoryRepository();
  }
  return _searchHistoryRepository;
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
  getCheckoutGroupLookup,
  getCheckoutGroupPaymentPort,
  getProductRepository,
  getEmailQueueRepository,
  getUserLookup,
  getForgotPasswordEmailPort,
  getUsedResetTokenStore,
  getSellerRepository,
  getSellerLookup,
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
  getSearchHistoryRepository,
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
  /** Override — useful in tests to inject a mock checkout-group lookup port. */
  setCheckoutGroupLookup(port: CheckoutGroupLookupPort): void {
    _checkoutGroupLookup = port;
  },
  /** Override — useful in tests to inject a mock checkout-group payment port. */
  setCheckoutGroupPaymentPort(port: CheckoutGroupPaymentPort): void {
    _checkoutGroupPaymentPort = port;
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
  /** Override — useful in tests to inject a mock seller lookup port. */
  setSellerLookup(port: SellerLookupPort): void {
    _sellerLookup = port;
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
  setCustomizationLookup(port: CartCustomizationLookupPort): void {
    _customizationLookup = port;
  },
  /** Override — useful in tests to inject a mock customization repository. */
  setCustomizationRepository(repo: CustomizationRepository): void {
    _customizationRepository = repo;
  },
  /** Override — useful in tests to inject an in-memory search-history repository. */
  setSearchHistoryRepository(repo: SearchHistoryRepository): void {
    _searchHistoryRepository = repo;
  },
  /** Reset the search-history event subscription flag — useful in tests to allow re-subscription. */
  resetSearchHistoryEventSubscriptions(): void {
    _isSearchHistoryEventsSubscribed = false;
  } /** Reset the event subscription flag — useful in tests to allow re-subscription. */,
  resetCartEventSubscriptions(): void {
    _isCartEventsSubscribed = false;
  },
};
