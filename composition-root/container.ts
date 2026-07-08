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
import type { EmailUserLookupPort } from '@/modules/email/domain/ports/email-user-lookup-port';
import type { EmailOrderLookupPort } from '@/modules/email/domain/ports/email-order-lookup-port';

import { BrevoEmailSender } from '@/shared/kernel/brevo-email-sender';
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
import { PrismaEmailUserLookup } from '@/modules/email/infrastructure/prisma-email-user-lookup';
import { PrismaEmailOrderLookup } from '@/modules/email/infrastructure/prisma-email-order-lookup';
import { EmailEventSubscribers } from '@/modules/email/application/email-event-subscribers';
import { EmailQueueDrainService } from '@/modules/email/application/email-queue-drain-service';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state: Record<string, unknown> = {};

function isLocalUploadStorage(): boolean {
  return process.env.SEED_PRODUCT_ASSET_LOCAL_STORAGE === 'true';
}

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
  getEmailUserLookup();
  getEmailOrderLookup();
  getEmailQueueDrainService();
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
  if (!state.isCartEventsSubscribed) {
    const handler = new HandleCartCheckedOut(
      state.orderRepository as OrderRepository,
      state.outboxRepository as OutboxRepository,
      state.transactionRunner as TransactionRunner,
      state.customizationLookup as CartCustomizationLookupPort,
    );
    HandleCartCheckedOut.subscribe(state.eventBus as EventBusPort, handler);
    state.isCartEventsSubscribed = true;
  }

  // --- Search-history event subscriptions (idempotent for HMR) ---
  if (!state.isSearchHistoryEventsSubscribed) {
    const subscriber = new HandleProductSearchExecuted(
      new RecordSearchUseCase(
        state.searchHistoryRepository as SearchHistoryRepository,
      ),
    );
    HandleProductSearchExecuted.subscribe(
      state.eventBus as EventBusPort,
      subscriber,
    );
    state.isSearchHistoryEventsSubscribed = true;
  }

  // --- Email event subscriptions (idempotent for HMR) ---
  if (!state.isEmailEventsSubscribed) {
    EmailEventSubscribers.subscribeAll(state.eventBus as EventBusPort, {
      emailQueueRepository: state.emailQueueRepository as EmailQueueRepository,
      emailUserLookup: state.emailUserLookup as EmailUserLookupPort,
      emailOrderLookup: state.emailOrderLookup as EmailOrderLookupPort,
      emailQueueDrainer: state.emailQueueDrainService as EmailQueueDrainService,
    });
    state.isEmailEventsSubscribed = true;
  }
}

// ---------------------------------------------------------------------------
// Getters (auto-initialize on first access)
// ---------------------------------------------------------------------------

export function getEmailSender(): EmailSender {
  if (!state.emailSender) {
    state.emailSender =
      process.env.NODE_ENV === 'production'
        ? new BrevoEmailSender()
        : new ConsoleEmailSender();
  }
  return state.emailSender as EmailSender;
}

export function getOutboxRepository(): OutboxRepository {
  state.outboxRepository ??= new PrismaOutboxRepository();
  return state.outboxRepository as OutboxRepository;
}

export function getPasswordHasher(): PasswordHasher {
  if (!state.passwordHasher) {
    state.passwordHasher = {
      hash: hashPassword,
      verify: verifyPassword,
    };
  }
  return state.passwordHasher as PasswordHasher;
}

export function getRateLimiter(): RateLimiter {
  state.rateLimiter ??= new PrismaRateLimiter();
  return state.rateLimiter as RateLimiter;
}

export function getResetTokenCodec(): ResetTokenCodec {
  if (!state.resetTokenCodec) {
    state.resetTokenCodec = new JwtResetTokenCodec(
      getSecrets().getAuthSecret(),
    );
  }
  return state.resetTokenCodec as ResetTokenCodec;
}

export function getEventBus(): EventBusPort {
  state.eventBus ??= eventBus;
  return state.eventBus as EventBusPort;
}

export function getSecrets(): SecretsPort {
  state.secrets ??= new ProcessEnvSecrets();
  return state.secrets as SecretsPort;
}

export function getSession(): SessionPort {
  state.session ??= new NextAuthSessionAdapter();
  return state.session as SessionPort;
}

export function getUserRepository(): UserRepository {
  state.userRepository ??= new PrismaUserRepository();
  return state.userRepository as UserRepository;
}

export function getRoleRepository(): RoleRepository {
  if (!state.roleRepository) {
    state.roleRepository = new PrismaRoleRepository();
    const seedRoles = new SeedRolesUseCase(
      state.roleRepository as RoleRepository,
    );
    (async () => {
      try {
        await seedRoles.execute();
      } catch (error) {
        console.error('[container] Role seed failed:', error);
      }
    })();
  }
  return state.roleRepository as RoleRepository;
}

export function getOrderRepository(): OrderRepository {
  state.orderRepository ??= new PrismaOrderRepository();
  return state.orderRepository as OrderRepository;
}

export function getCheckoutGroupLookup(): CheckoutGroupLookupPort {
  state.checkoutGroupLookup ??= new PrismaCheckoutGroupLookup();
  return state.checkoutGroupLookup as CheckoutGroupLookupPort;
}

export function getCheckoutGroupPaymentPort(): CheckoutGroupPaymentPort {
  state.checkoutGroupPaymentPort ??= new PrismaCheckoutGroupPaymentPort();
  return state.checkoutGroupPaymentPort as CheckoutGroupPaymentPort;
}

export function getProductRepository(): ProductRepository {
  state.productRepository ??= new PrismaProductRepository();
  return state.productRepository as ProductRepository;
}

export function getEmailQueueRepository(): EmailQueueRepository {
  state.emailQueueRepository ??= new PrismaEmailQueueRepository();
  return state.emailQueueRepository as EmailQueueRepository;
}

export function getUserLookup(): UserLookupPort {
  state.userLookup ??= new PrismaUserLookup();
  return state.userLookup as UserLookupPort;
}

export function getEmailUserLookup(): EmailUserLookupPort {
  state.emailUserLookup ??= new PrismaEmailUserLookup();
  return state.emailUserLookup as EmailUserLookupPort;
}

export function getEmailOrderLookup(): EmailOrderLookupPort {
  state.emailOrderLookup ??= new PrismaEmailOrderLookup();
  return state.emailOrderLookup as EmailOrderLookupPort;
}

export function getEmailQueueDrainService(): EmailQueueDrainService {
  if (!state.emailQueueDrainService) {
    state.emailQueueDrainService = new EmailQueueDrainService(
      getEmailQueueRepository(),
      getEmailSender(),
    );
  }

  return state.emailQueueDrainService as EmailQueueDrainService;
}

export function getUsedResetTokenStore(): UsedResetTokenStorePort {
  state.usedResetTokenStore ??= new MemoryUsedResetTokenStore();
  return state.usedResetTokenStore as UsedResetTokenStorePort;
}

export function getSellerRepository(): SellerRepository {
  state.sellerRepository ??= new PrismaSellerRepository();
  return state.sellerRepository as SellerRepository;
}

export function getSellerLookup(): SellerLookupPort {
  if (!state.sellerLookup) {
    state.sellerLookup = new SellerLookupAdapter(getSellerRepository());
  }
  return state.sellerLookup as SellerLookupPort;
}

export function getTransactionRunner(): TransactionRunner {
  state.transactionRunner ??= new PrismaTransactionRunner();
  return state.transactionRunner as TransactionRunner;
}

export function getUserVerification(): UserVerificationPort {
  if (!state.userVerification) {
    state.userVerification = new UserVerificationAdapter(getUserRepository());
  }
  return state.userVerification as UserVerificationPort;
}

export function getRoleValidator(): RoleValidatorPort {
  if (!state.roleValidator) {
    state.roleValidator = new RoleValidatorAdapter(getRoleRepository());
  }
  return state.roleValidator as RoleValidatorPort;
}

export function getStoragePort(): StoragePort {
  if (!state.storagePort) {
    state.storagePort = isLocalUploadStorage()
      ? new LocalStorageAdapter()
      : new R2StorageAdapter();
  }
  return state.storagePort as StoragePort;
}

export function getUploadRepository(): UploadRepository {
  state.uploadRepository ??= new PrismaUploadRepository();
  return state.uploadRepository as UploadRepository;
}

export function getCartRepository(): CartRepository {
  state.cartRepository ??= new PrismaCartRepository();
  return state.cartRepository as CartRepository;
}

export function getCartProductRepository(): CartProductRepository {
  if (!state.cartProductRepository) {
    state.cartProductRepository = new CartProductRepositoryAdapter(
      getProductRepository(),
    );
  }
  return state.cartProductRepository as CartProductRepository;
}

export function getPaidOrderCountPort(): PaidOrderCountPort {
  if (!state.paidOrderCountPort) {
    state.paidOrderCountPort = new PrismaPaidOrderCountAdapter(
      getOrderRepository(),
    );
  }
  return state.paidOrderCountPort as PaidOrderCountPort;
}

export function getCustomizationRepository(): CustomizationRepository {
  state.customizationRepository ??= new PrismaCustomizationRepository();
  return state.customizationRepository as CustomizationRepository;
}

export function getCustomizationLookup(): CartCustomizationLookupPort {
  if (!state.customizationLookup) {
    state.customizationLookup = new CustomizationLookupAdapter(
      getCustomizationRepository(),
    );
  }
  return state.customizationLookup as CartCustomizationLookupPort;
}

export function getSearchHistoryRepository(): SearchHistoryRepository {
  state.searchHistoryRepository ??= new PrismaSearchHistoryRepository();
  return state.searchHistoryRepository as SearchHistoryRepository;
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
  getEmailUserLookup,
  getEmailOrderLookup,
  getEmailQueueDrainService,
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
  setEmailSender(sender: EmailSender): void {
    state.emailSender = sender;
  },
  setOutboxRepository(repo: OutboxRepository): void {
    state.outboxRepository = repo;
  },
  setPasswordHasher(hasher: PasswordHasher): void {
    state.passwordHasher = hasher;
  },
  setRateLimiter(limiter: RateLimiter): void {
    state.rateLimiter = limiter;
  },
  setResetTokenCodec(codec: ResetTokenCodec): void {
    state.resetTokenCodec = codec;
  },
  setEventBus(bus: EventBusPort): void {
    state.eventBus = bus;
  },
  setSecrets(secrets: SecretsPort): void {
    state.secrets = secrets;
  },
  setSession(session: SessionPort): void {
    state.session = session;
  },
  setUserRepository(repo: UserRepository): void {
    state.userRepository = repo;
  },
  setRoleRepository(repo: RoleRepository): void {
    state.roleRepository = repo;
  },
  setOrderRepository(repo: OrderRepository): void {
    state.orderRepository = repo;
  },
  setCheckoutGroupLookup(port: CheckoutGroupLookupPort): void {
    state.checkoutGroupLookup = port;
  },
  setCheckoutGroupPaymentPort(port: CheckoutGroupPaymentPort): void {
    state.checkoutGroupPaymentPort = port;
  },
  setProductRepository(repo: ProductRepository): void {
    state.productRepository = repo;
  },
  setEmailQueueRepository(repo: EmailQueueRepository): void {
    state.emailQueueRepository = repo;
  },
  setEmailQueueDrainService(service: EmailQueueDrainService): void {
    state.emailQueueDrainService = service;
  },
  setUserLookup(port: UserLookupPort): void {
    state.userLookup = port;
  },
  setUsedResetTokenStore(store: UsedResetTokenStorePort): void {
    state.usedResetTokenStore = store;
  },
  setSellerRepository(repo: SellerRepository): void {
    state.sellerRepository = repo;
  },
  setSellerLookup(port: SellerLookupPort): void {
    state.sellerLookup = port;
  },
  setTransactionRunner(runner: TransactionRunner): void {
    state.transactionRunner = runner;
  },
  setUserVerification(port: UserVerificationPort): void {
    state.userVerification = port;
  },
  setRoleValidator(port: RoleValidatorPort): void {
    state.roleValidator = port;
  },
  setStoragePort(port: StoragePort): void {
    state.storagePort = port;
  },
  setUploadRepository(repo: UploadRepository): void {
    state.uploadRepository = repo;
  },
  setCartRepository(repo: CartRepository): void {
    state.cartRepository = repo;
  },
  setCartProductRepository(repo: CartProductRepository): void {
    state.cartProductRepository = repo;
  },
  setPaidOrderCountPort(port: PaidOrderCountPort): void {
    state.paidOrderCountPort = port;
  },
  setCustomizationLookup(port: CartCustomizationLookupPort): void {
    state.customizationLookup = port;
  },
  setCustomizationRepository(repo: CustomizationRepository): void {
    state.customizationRepository = repo;
  },
  setSearchHistoryRepository(repo: SearchHistoryRepository): void {
    state.searchHistoryRepository = repo;
  },
  resetSearchHistoryEventSubscriptions(): void {
    state.isSearchHistoryEventsSubscribed = false;
  },
  resetCartEventSubscriptions(): void {
    state.isCartEventsSubscribed = false;
  },
  resetEmailEventSubscriptions(): void {
    state.isEmailEventsSubscribed = false;
  },
};
